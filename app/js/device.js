/**
 * Bosch PLR/GLM BLE Device Manager
 *
 * Handles connection, command sending, and indication processing.
 * Tested with Bosch PLR 50C.
 */
import {
    GLM_SERVICE_UUID,
    TX_CHARACTERISTIC_UUID,
    CMD_MEASURE,
    CMD_LASER_ON,
    CMD_LASER_OFF,
    CMD_BEEP_ON,
    CMD_BEEP_OFF,
    CMD_BACKLIGHT_ON,
    CMD_BACKLIGHT_OFF,
    CMD_EXCHANGE_DATA,
    CMD_CLEAR_MEASUREMENTS,
    CMD_DEVICE_INFO,
    FORMAT_LONG,
    FORMAT_SHORT,
    buildCommand,
    verifyChecksum,
    parseFrameHeader,
    parseShortFrameStatus,
    parseMeasurementData,
    toHex,
} from './protocol.js';

export class BoschDevice {
    /** @type {BluetoothRemoteGATTServer | null} */
    _server = null;
    /** @type {BluetoothRemoteGATTCharacteristic | null} */
    _characteristic = null;
    /** @type {BluetoothDevice | null} */
    _device = null;
    /** @type {object} */
    _events = {};
    /** @type {boolean} */
    _busy = false;

    /**
     * @param {object} events
     * @param {function} [events.onMeasurement] - Called with parsed measurement data
     * @param {function} [events.onStatus] - Called with parsed short frame status
     * @param {function} [events.onStatusChange] - Called with (state, message)
     * @param {function} [events.onRawFrame] - Called with (DataView, hex string)
     */
    constructor(events = {}) {
        this._events = events;
    }

    get connected() {
        return this._server?.connected ?? false;
    }

    get deviceName() {
        return this._device?.name ?? null;
    }

    /**
     * Pair with a Bosch PLR/GLM device via Web Bluetooth.
     * @returns {Promise<string>} Device name
     */
    async connect() {
        this._emit('onStatusChange', 'connecting', 'Scanning for device…');

        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'Bosch PLR' },
                { namePrefix: 'Bosch GLM' },
                { services: [GLM_SERVICE_UUID] },
            ],
            optionalServices: [TX_CHARACTERISTIC_UUID],
        });

        this._device = device;
        this._emit('onStatusChange', 'connecting', `Connecting to ${device.name}…`);

        device.addEventListener('gattserverdisconnected', () => this._onDisconnect());

        const server = await device.gatt.connect();
        this._server = server;

        const service = await server.getPrimaryService(GLM_SERVICE_UUID);
        this._characteristic = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);

        await this._characteristic.startNotifications();
        this._characteristic.addEventListener('characteristicvaluechanged', (e) =>
            this._onIndication(e),
        );

        // Enable AutoSync: device sends measurements automatically
        await this._send(CMD_EXCHANGE_DATA, new Uint8Array([0x01, 0x00]));

        this._emit('onStatusChange', 'connected', device.name);
        return device.name;
    }

    disconnect() {
        if (this._server?.connected) {
            this._server.disconnect();
        }
        this._cleanup();
        this._emit('onStatusChange', 'disconnected', 'Disconnected');
    }

    // --- Commands ---

    /**
     * Trigger a distance measurement.
     * Note: always returns distance regardless of device mode.
     * For angle/area/volume, use the device button — results sync via AutoSync.
     * @param {number} [edge=0x00] - Reference edge (0=back, 1=front, 2=side)
     */
    async measure(edge = 0x00) {
        await this._send(CMD_MEASURE, new Uint8Array([edge]));
    }

    async laserOn() {
        await this._send(CMD_LASER_ON, new Uint8Array([0x00]));
    }

    async laserOff() {
        await this._send(CMD_LASER_OFF, new Uint8Array([0x00]));
    }

    /**
     * @param {number} [durationMs=500]
     */
    async beep(durationMs = 500) {
        await this._send(CMD_BEEP_ON, new Uint8Array([0x00]));
        await new Promise((r) => setTimeout(r, durationMs));
        this._busy = false;
        await this._send(CMD_BEEP_OFF, new Uint8Array([0x00]));
    }

    async backlightOn() {
        await this._send(CMD_BACKLIGHT_ON, new Uint8Array([0x00]));
    }

    async backlightOff() {
        await this._send(CMD_BACKLIGHT_OFF, new Uint8Array([0x00]));
    }

    /**
     * Change device mode via Exchange Data Container (CMD 0x55).
     * DevModeSync byte: Bit[7..2]=DevMode(60=SetDevAppMode), Bit[0]=AutoSync
     * RemoteCtrlData byte: target mode
     * @param {number} mode - 1=Distance, 2=Area, 4=Angle, 7=Volume, 8=IndirectHeight, etc.
     */
    async changeMode(mode) {
        const devModeSync = (60 << 2) | 0x01; // DevMode=60(SetDevAppMode) + AutoSync=1
        await this._send(CMD_EXCHANGE_DATA, new Uint8Array([devModeSync, mode]));
    }

    /**
     * Set distance reference via Exchange Data Container.
     * @param {number} ref - 0=Front, 1=Tripod, 2=Rear
     */
    async setDistanceReference(ref) {
        const devModeSync = (62 << 2) | 0x01; // DevMode=62(SetDistanceReference) + AutoSync
        await this._send(CMD_EXCHANGE_DATA, new Uint8Array([devModeSync, ref]));
    }

    async clearMeasurements() {
        await this._send(CMD_CLEAR_MEASUREMENTS);
    }

    async requestDeviceInfo() {
        await this._send(CMD_DEVICE_INFO);
    }

    /**
     * Send a raw command for protocol exploration.
     * @param {number} command
     * @param {Uint8Array} [data]
     */
    async sendCommand(command, data) {
        await this._send(command, data);
    }

    // --- Private ---

    async _send(command, data) {
        if (!this._characteristic) {
            throw new Error('Not connected');
        }
        if (this._busy) {
            throw new Error('Command in progress, please wait');
        }
        this._busy = true;
        try {
            const frame = buildCommand(command, data);
            await this._characteristic.writeValueWithResponse(frame);
        } finally {
            this._busy = false;
        }
    }

    _onIndication(event) {
        const message = event.target.value;
        const hex = toHex(message);

        this._emit('onRawFrame', message, hex);

        const header = parseFrameHeader(message);
        if (header.isInvalid) return;

        if (
            (header.isRequest && header.requestFormat === FORMAT_SHORT) ||
            (header.isResponse && header.responseFormat === FORMAT_SHORT)
        ) {
            this._emit('onStatus', parseShortFrameStatus(message));
            return;
        }

        if (header.isRequest && header.requestFormat === FORMAT_LONG) {
            this._handleLongRequest(message);
        } else if (header.isResponse && header.responseFormat === FORMAT_LONG) {
            this._handleLongResponse(message);
        }
    }

    _handleLongRequest(message) {
        if (!verifyChecksum(message)) return;

        const command = message.getUint8(1);
        const dataLength = message.getUint8(2);

        if (command === CMD_EXCHANGE_DATA && dataLength > 0) {
            const data = parseMeasurementData(message, 3, dataLength);
            if (data) {
                this._emit('onMeasurement', { source: 'device', ...data });
            }
            return;
        }

        if (dataLength > 0) {
            const data = parseMeasurementData(message, 3, dataLength);
            if (data) {
                this._emit('onMeasurement', { source: 'device', ...data });
            }
        }
    }

    _handleLongResponse(message) {
        if (!verifyChecksum(message)) return;

        const dataLength = message.getUint8(1);
        if (dataLength === 0) return;

        const data = parseMeasurementData(message, 2, dataLength);
        if (data) {
            this._emit('onMeasurement', { source: 'browser', ...data });
        }
    }

    _onDisconnect() {
        this._cleanup();
        this._emit('onStatusChange', 'disconnected', 'Device disconnected');
    }

    _cleanup() {
        this._server = null;
        this._characteristic = null;
        this._device = null;
    }

    _emit(eventName, ...args) {
        if (typeof this._events[eventName] === 'function') {
            this._events[eventName](...args);
        }
    }
}

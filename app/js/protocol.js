/**
 * Bosch PLR/GLM MT Connectivity Protocol
 *
 * Reference: MT_connectivity_protocol_1_2_9.pdf
 *            MT_connectivity_protocol_LRF_command_set_2_5_0.pdf
 */

// BLE identifiers
export const GLM_SERVICE_UUID = '00005301-0000-0041-5253-534f46540000';
export const TX_CHARACTERISTIC_UUID = '00004301-0000-0041-5253-534f46540000';

// Frame types (bits 6-7 of mode byte)
export const FRAME_TYPE_RESPONSE = 0b00;
export const FRAME_TYPE_REQUEST = 0b11;

// Frame formats
export const FORMAT_LONG = 0b00;
export const FORMAT_SHORT = 0b01;

// Commands
export const CMD_MEASURE = 0x40;
export const CMD_LASER_ON = 0x41;
export const CMD_LASER_OFF = 0x42;
export const CMD_BEEP_ON = 0x45;
export const CMD_BEEP_OFF = 0x46;
export const CMD_BACKLIGHT_ON = 0x47;
export const CMD_BACKLIGHT_OFF = 0x48;
export const CMD_GET_MEASUREMENTS = 0x51;
export const CMD_CLEAR_MEASUREMENTS = 0x52;
export const CMD_EXCHANGE_DATA = 0x55;
export const CMD_DEVICE_INFO = 0x3a;

// Reference edges for CMD_MEASURE payload (bits 6-7)
// Doc says: 0=Front, 1=Tripod, 2=Rear, 3=Pin
// PLR 50C: 0x40 and 0x80 both return rear distance, 0xC0 returns tripod
export const EDGE_FRONT = 0x00;  // 0b00xxxxxx → front of device
export const EDGE_REAR = 0x80;   // 0b10xxxxxx → rear of device
export const EDGE_TRIPOD = 0xc0; // 0b11xxxxxx → tripod mount

// Device modes as reported in 16-byte measurement blocks (devModeRef >> 2)
export const DEVICE_MODES = {
    1: 'Distance',
    2: 'Continuous',
    3: 'Area (partial)',
    4: 'Area',
    5: 'Volume (partial)',
    6: 'Volume (partial)',
    7: 'Volume',
    8: 'Angle',
};

// Distance reference (bits 0-1 of devModeRef)
export const DISTANCE_REFERENCES = {
    0: 'Back',
    1: 'Front',
    2: 'Tripod',
};

// Short response status codes (bits 0-2)
export const STATUS_CODES = {
    0x00: 'Success',
    0x01: 'Communication timeout',
    0x02: 'Mode not supported',
    0x03: 'Checksum error',
    0x04: 'Command unknown',
    0x05: 'Access level invalid',
    0x06: 'Parameter invalid',
};

// CRC-8 lookup table (polynomial 0xA6, init 0xAA)
// prettier-ignore
const CRC_TABLE = new Uint8Array([
    0x00, 0xA6, 0xEA, 0x4C, 0x72, 0xD4, 0x98, 0x3E, 0xE4, 0x42, 0x0E, 0xA8, 0x96, 0x30, 0x7C, 0xDA,
    0x6E, 0xC8, 0x84, 0x22, 0x1C, 0xBA, 0xF6, 0x50, 0x8A, 0x2C, 0x60, 0xC6, 0xF8, 0x5E, 0x12, 0xB4,
    0xDC, 0x7A, 0x36, 0x90, 0xAE, 0x08, 0x44, 0xE2, 0x38, 0x9E, 0xD2, 0x74, 0x4A, 0xEC, 0xA0, 0x06,
    0xB2, 0x14, 0x58, 0xFE, 0xC0, 0x66, 0x2A, 0x8C, 0x56, 0xF0, 0xBC, 0x1A, 0x24, 0x82, 0xCE, 0x68,
    0x1E, 0xB8, 0xF4, 0x52, 0x6C, 0xCA, 0x86, 0x20, 0xFA, 0x5C, 0x10, 0xB6, 0x88, 0x2E, 0x62, 0xC4,
    0x70, 0xD6, 0x9A, 0x3C, 0x02, 0xA4, 0xE8, 0x4E, 0x94, 0x32, 0x7E, 0xD8, 0xE6, 0x40, 0x0C, 0xAA,
    0xC2, 0x64, 0x28, 0x8E, 0xB0, 0x16, 0x5A, 0xFC, 0x26, 0x80, 0xCC, 0x6A, 0x54, 0xF2, 0xBE, 0x18,
    0xAC, 0x0A, 0x46, 0xE0, 0xDE, 0x78, 0x34, 0x92, 0x48, 0xEE, 0xA2, 0x04, 0x3A, 0x9C, 0xD0, 0x76,
    0x3C, 0x9A, 0xD6, 0x70, 0x4E, 0xE8, 0xA4, 0x02, 0xD8, 0x7E, 0x32, 0x94, 0xAA, 0x0C, 0x40, 0xE6,
    0x52, 0xF4, 0xB8, 0x1E, 0x20, 0x86, 0xCA, 0x6C, 0xB6, 0x10, 0x5C, 0xFA, 0xC4, 0x62, 0x2E, 0x88,
    0xE0, 0x46, 0x0A, 0xAC, 0x92, 0x34, 0x78, 0xDE, 0x04, 0xA2, 0xEE, 0x48, 0x76, 0xD0, 0x9C, 0x3A,
    0x8E, 0x28, 0x64, 0xC2, 0xFC, 0x5A, 0x16, 0xB0, 0x6A, 0xCC, 0x80, 0x26, 0x18, 0xBE, 0xF2, 0x54,
    0x22, 0x84, 0xC8, 0x6E, 0x50, 0xF6, 0xBA, 0x1C, 0xC6, 0x60, 0x2C, 0x8A, 0xB4, 0x12, 0x5E, 0xF8,
    0x4C, 0xEA, 0xA6, 0x00, 0x3E, 0x98, 0xD4, 0x72, 0xA8, 0x0E, 0x42, 0xE4, 0xDA, 0x7C, 0x30, 0x96,
    0xFE, 0x58, 0x14, 0xB2, 0x8C, 0x2A, 0x66, 0xC0, 0x1A, 0xBC, 0xF0, 0x56, 0x68, 0xCE, 0x82, 0x24,
    0x90, 0x36, 0x7A, 0xDC, 0xE2, 0x44, 0x08, 0xAE, 0x74, 0xD2, 0x9E, 0x38, 0x06, 0xA0, 0xEC, 0x4A,
]);

/**
 * Compute CRC-8 checksum (polynomial 0xA6, init 0xAA).
 * @param {Uint8Array} buffer
 * @returns {number}
 */
export function crc8(buffer) {
    let crc = 0xaa;
    for (let i = 0; i < buffer.length; i++) {
        crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff];
    }
    return crc;
}

/**
 * Verify the CRC-8 checksum of a received frame.
 * @param {DataView} message
 * @returns {boolean}
 */
export function verifyChecksum(message) {
    const payload = new Uint8Array(message.buffer, message.byteOffset, message.byteLength - 1);
    const calculated = crc8(payload);
    const received = message.getUint8(message.byteLength - 1);
    return calculated === received;
}

/**
 * Build a command frame with CRC-8 checksum.
 * @param {number} command
 * @param {Uint8Array} [data]
 * @returns {Uint8Array}
 */
export function buildCommand(command, data) {
    const hasData = data && data.length > 0;
    const frameLength = hasData ? 3 + data.length + 1 : 4; // mode + cmd + len + [data] + crc
    const frame = new Uint8Array(frameLength);

    frame[0] = 0xc0; // mode: request, long format
    frame[1] = command;
    frame[2] = hasData ? data.length : 0x00;

    if (hasData) {
        frame.set(data, 3);
    }

    frame[frameLength - 1] = crc8(frame.subarray(0, frameLength - 1));
    return frame;
}

/**
 * Convert a DataView to a hex string.
 * @param {DataView} dataView
 * @returns {string}
 */
export function toHex(dataView) {
    let hex = '';
    for (let i = 0; i < dataView.byteLength; i++) {
        hex += dataView.getUint8(i).toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * Parse frame header to extract type and format info.
 * @param {DataView} message
 * @returns {object}
 */
export function parseFrameHeader(message) {
    const mode = message.getUint8(0);
    const frameType = mode >> 6;
    const requestFormat = (mode & 0b00001100) >> 2;
    const responseFormat = mode & 0b00000011;

    return {
        frameType,
        requestFormat,
        responseFormat,
        isRequest: frameType === FRAME_TYPE_REQUEST,
        isResponse: frameType === FRAME_TYPE_RESPONSE,
        isInvalid: frameType === 0b01 || frameType === 0b10,
    };
}

/**
 * Parse a short response/request frame status byte.
 *
 * Short frame format: [mode][status][crc]
 * Status byte layout:
 *   bits 0-2: status code (see STATUS_CODES)
 *   bit 3:    hardware error
 *   bit 4:    not ready
 *   bit 5:    hand raised
 *
 * @param {DataView} message
 * @returns {object}
 */
export function parseShortFrameStatus(message) {
    const status = message.getUint8(1);
    const statusCode = status & 0x07;

    return {
        statusCode,
        statusMessage: STATUS_CODES[statusCode] || `Unknown (${statusCode})`,
        isSuccess: statusCode === 0x00,
        hardwareError: !!(status & 0x08),
        notReady: !!(status & 0x10),
        handRaised: !!(status & 0x20),
    };
}

/**
 * Parse a GLMSyncContainer from the Exchange Data Container response.
 *
 * The sync container is sent by the device when AutoSync is enabled and
 * the user triggers a measurement on the device itself.
 *
 * Layout (33 bytes):
 *   [0]     measurement type (bits 0-4), calc indicator (bits 5-7)
 *   [1]     distance ref (bits 0-2), angle ref (bits 3-5), distance unit (bit 6)
 *   [2]     battery state of charge (%)
 *   [3]     temperature (°C, signed)
 *   [4-7]   distance 1 (float32 LE, meters)
 *   [8-11]  distance 2 (float32 LE, meters)
 *   [12-15] distance 3 (float32 LE, meters)
 *   [16-19] result (float32 LE, meters)
 *   [20-23] angle (float32 LE, degrees)
 *   [24-27] timestamp (uint32 LE)
 *   [28]    laser on (bit 0), usability errors (bits 1-7)
 *   [29]    measurement list index
 *   [30-31] compass heading (int16 LE, degrees)
 *   [32]    NDOF sensor status
 *
 * @param {DataView} message
 * @param {number} dataOffset
 * @returns {object}
 */
export function parseSyncContainer(message, dataOffset) {
    const byte0 = message.getUint8(dataOffset);
    const byte1 = message.getUint8(dataOffset + 1);

    const measurementTypeId = byte0 & 0x1f;
    const calcIndicator = (byte0 >> 5) & 0x07;
    const distanceRef = byte1 & 0x07;
    const angleRef = (byte1 >> 3) & 0x07;
    const distanceUnit = (byte1 >> 6) & 0x01;

    const battery = message.getUint8(dataOffset + 2);
    const temperature = message.getInt8(dataOffset + 3);

    const distance1 = readFloat32(message, dataOffset + 4);
    const distance2 = readFloat32(message, dataOffset + 8);
    const distance3 = readFloat32(message, dataOffset + 12);
    const result = readFloat32(message, dataOffset + 16);
    const angle = readFloat32(message, dataOffset + 20);
    const timestamp = message.getUint32(dataOffset + 24, true);

    const byte28 = message.getUint8(dataOffset + 28);
    const laserOn = !!(byte28 & 0x01);
    const errors = byte28 >> 1;

    const measurementIndex = message.getUint8(dataOffset + 29);
    const compassHeading = message.getInt16(dataOffset + 30, true);
    const ndofStatus = message.getUint8(dataOffset + 32);

    return {
        measurementType: DEVICE_MODES[measurementTypeId] || `Unknown (${measurementTypeId})`,
        measurementTypeId,
        calcIndicator,
        distanceReference: DISTANCE_REFERENCES[distanceRef] || `Unknown (${distanceRef})`,
        distanceRefId: distanceRef,
        angleRef,
        distanceUnit: distanceUnit === 0 ? 'Metric' : 'Imperial',
        battery,
        temperature,
        distance1,
        distance2,
        distance3,
        result,
        angle,
        timestamp,
        laserOn,
        errors,
        measurementIndex,
        compassHeading,
        ndofStatus,
    };
}

/**
 * Parse a measurement result from a long request/response frame.
 *
 * 4-byte response (CMD_MEASURE reply):
 *   uint32 LE distance in 0.05mm units
 *
 * 16-byte data block (AutoSync measurement):
 *   [0]     DevModeRef: mode (bits 2-7), reference edge (bits 0-1)
 *   [1]     DevStatus: metric (bit 3), low battery (bit 2), temp warning (bit 1), laser (bit 0)
 *   [2-3]   UniqueID (uint16 LE)
 *   [4-7]   result (float32 LE)
 *   [8-11]  component1 (float32 LE) — intermediate side or first side
 *   [12-15] component2 (float32 LE) — second side (area) or unused
 *
 * @param {DataView} message
 * @param {number} dataOffset
 * @param {number} dataLength
 * @returns {object | null}
 */
export function parseMeasurementData(message, dataOffset, dataLength) {
    if (dataLength === 0) return null;

    // 4-byte response: uint32 LE distance in 0.05mm units
    if (dataLength === 4) {
        const raw = message.getUint32(dataOffset, true);
        return { result: (raw * 0.05) / 1000 }; // convert to meters
    }

    // 16-byte measurement block with device status
    if (dataLength >= 16) {
        const devModeRef = message.getUint8(dataOffset);
        const devStatus = message.getUint8(dataOffset + 1);
        const uniqueId = message.getUint16(dataOffset + 2, true);

        const modeId = devModeRef >> 2;
        return {
            mode: modeId,
            measurementType: DEVICE_MODES[modeId] || `Unknown (${modeId})`,
            referenceEdge: devModeRef & 0x03,
            distanceReference: DISTANCE_REFERENCES[devModeRef & 0x03],
            metricSystem: !!(devStatus & 0x08),
            lowBattery: !!(devStatus & 0x04),
            temperatureWarning: !!(devStatus & 0x02),
            laserOn: !!(devStatus & 0x01),
            uniqueId,
            result: readFloat32(message, dataOffset + 4),
            component1: readFloat32(message, dataOffset + 8),
            component2: readFloat32(message, dataOffset + 12),
        };
    }

    return null;
}

/**
 * Read a little-endian float32 from a DataView.
 * @param {DataView} view
 * @param {number} offset
 * @returns {number}
 */
function readFloat32(view, offset) {
    const buf = new DataView(new ArrayBuffer(4));
    for (let i = 0; i < 4; i++) {
        buf.setUint8(i, view.getUint8(offset + i));
    }
    return buf.getFloat32(0, true);
}

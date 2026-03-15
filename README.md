# Bosch PLR/GLM Web Bluetooth Demo

A Web Bluetooth demo for communicating with Bosch PLR and GLM laser rangefinders. Tested with the **Bosch PLR 50C**.

> **Browser support:** Web Bluetooth API is currently supported in Chrome and Edge only.

## Features

- **Connect/disconnect** via Web Bluetooth
- **Trigger distance measurements** from the browser with configurable reference edge (back, front, side)
- **AutoSync** — automatically receive all measurements triggered on the device (distance, angle, area, volume)
- **Full protocol parsing** — CRC-8 validation, long/short frame handling, 16-byte measurement blocks
- **Measurement types** — distance, continuous, area, volume, angle with correct units (m, m², m³, °)
- **Side measurements** — area and volume results include individual side values
- **Live UI** — real-time measurement display, history table, raw BLE frame log
- **Device info** — battery level, temperature, laser status from measurement data
- **Command explorer** — send raw hex commands to explore the device protocol

## PLR 50C Protocol Notes

The PLR 50C has limited BLE command support:

| Feature | Status | Notes |
|---------|--------|-------|
| Distance measurement | Works | `CMD 0x40` with edge byte |
| AutoSync | Works | `CMD 0x55` with `[0x01, 0x00]` — receives all measurement types |
| Mode change | Not supported | Device acknowledges but ignores. Change mode on the device. |
| Laser on/off | Not supported | Device acknowledges but ignores |
| Backlight | Not supported | Device acknowledges but ignores |
| Beep | Not supported | Device acknowledges but ignores |

### AutoSync Measurement Block (16 bytes)

When a measurement is triggered on the device, it sends a 16-byte block via `CMD_EXCHANGE_DATA` (0x55):

| Offset | Size | Content |
|--------|------|---------|
| 0 | 1 | DevModeRef: mode (bits 2-7), reference edge (bits 0-1) |
| 1 | 1 | DevStatus: metric (bit 3), low battery (bit 2), temp warning (bit 1), laser (bit 0) |
| 2-3 | 2 | UniqueID (uint16 LE) |
| 4-7 | 4 | Result (float32 LE) |
| 8-11 | 4 | Component 1 (float32 LE) — intermediate side or first side |
| 12-15 | 4 | Component 2 (float32 LE) — second side (area) or unused |

### Mode IDs (from DevModeRef >> 2)

| ID | Type | Notes |
|----|------|-------|
| 1 | Distance | Single measurement |
| 2 | Continuous | Continuous measurement |
| 3 | Area (partial) | Intermediate step — component1 = measured side |
| 4 | Area | Final result — component1 = side 1, component2 = side 2 |
| 5 | Volume (partial) | Intermediate step — component1 = measured side |
| 6 | Volume (partial) | Intermediate step — component1 = measured side |
| 7 | Volume | Final result — component1 = last side |
| 8 | Angle | Inclination in degrees |

### Distance Measurement Response (4 bytes)

Response to `CMD_MEASURE` (0x40): `uint32 LE` in units of 0.05mm.

Example: `0x00007C9E` = 31902 × 0.05 = 1595.1mm = **1.595m**

## Project Structure

```
app/
├── index.html          # Demo UI
└── js/
    ├── protocol.js     # MT Protocol: constants, CRC-8, frame parsing
    └── device.js       # BoschDevice class: connection, commands, events
docs/
├── MT_connectivity_protocol_1_2_9.pdf
└── MT_connectivity_protocol_LRF_command_set_2_5_0.pdf
```

## BLE Identifiers

| Element | UUID |
|---------|------|
| Service | `00005301-0000-0041-5253-534F46540000` |
| Characteristic | `00004301-0000-0041-5253-534F46540000` |

> The PLR 50C exposes a single characteristic for both read (notifications) and write.

## Frame Format

```
[mode] [command?] [length] [data...] [crc8]
```

- **Mode byte** — frame type (bits 6-7: `11`=request, `00`=response) and format (bits 0-1: `00`=long, `01`=short)
- **CRC-8** — polynomial `0xA6`, init value `0xAA`

## Running Locally

Serve the `app/` directory:

```bash
# Python
python3 -m http.server 8080 --directory app

# PHP
php -S localhost:8080 -t app
```

Open `http://localhost:8080` in Chrome or Edge.

> On `localhost`, Chrome allows Web Bluetooth without HTTPS.

## Official Documentation

The `docs/` folder contains protocol specifications from the Bosch GLM/PLR Bluetooth App Kit:
- `MT_connectivity_protocol_1_2_9.pdf` — Transport layer protocol
- `MT_connectivity_protocol_LRF_command_set_2_5_0.pdf` — LRF command set

## Related Projects

- [piannucci/pymtprotocol](https://github.com/piannucci/pymtprotocol) — Python MT protocol implementation for Bosch GLM100
- [philipptrenz/BOSCH-GLM-rangefinder](https://github.com/philipptrenz/BOSCH-GLM-rangefinder) — Python script for Bosch GLM 100C (archived)

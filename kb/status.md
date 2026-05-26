# WaterTank — Project Status
_Last updated: 2026-05-26_

## App Version
`1.0.0` (package.json) | Latest APK: `app-release.apk` (v26, built 2026-05-26, master branch, includes full BLE OTA)
- v24: Toast→inline banner (no motor card overlap), motor border opacity fix, spacer capped; refactor index.tsx 675→359 lines
- v23: Dashboard layout — tank/% spacing, motor status section label, spacer for vertical distribution
- v22: Setup guide images (correct aspect ratios), app freeze-on-resume fix (AppState), right-to-left swipe fix
- v21: Fixed TANK_WINDOW clip coords — water now fills correctly from 0-100% visible in window
- v20: SetupGuideModal (3-page image viewer in Settings), post-audit fixes (H1/H2/M1-M3/L1/L3)
- v19: all 44 auditp1.md findings resolved

## Build Status
- Android release APK: `android/app/build/outputs/apk/release/app-release.apk`
- Expo SDK: ~54 | RN: 0.81.5 | React: 19
- **IMPORTANT**: Always run `cd android && ./gradlew clean` before release builds when any image asset has changed

## Completed Tasks (from TASKS.md / LESSONS.md)
- TASK-030: Color palette (dark PennyWise theme)
- TASK-031: i18n translations (en/hi/mr/kn)
- TASK-032: LanguageContext
- TASK-033: Event model labels + HIDDEN_EVENT_TYPES
- TASK-034: Formatters (12h time, no decimals)
- TASK-035: WaterTankWidget (SVG cylinder)
- TASK-036: StatusDot with translations
- TASK-037: EventRow — hide BLE_SYNCED, 12h time, rounded tank%
- TASK-038: Records screen
- TASK-039: Dashboard — WaterTankWidget, friendly labels
- TASK-040: Settings — language picker
- v14: WaterTankWidget PNG overlay (react-native-svg + PNG)
- v15: Tank color selector (black/blue) in Settings
- v16: blue-tank.png normalized to 1024×1536 matching black tank canvas
- v18: Per-color SVG clip rect + clean rebuild to fix cache bug

## WaterTankWidget — PNG Overlay State
- `TANK_IMAGES = { black: require('@/assets/images/water-tank.png'), blue: require('@/assets/images/blue-tank.png') }`
- `TANK_WINDOW = { black: {CX:78,CY:101,CW:174,CH:192}, blue: {CX:69,CY:113,CW:178,CH:172} }` ← fixed v21
- Both PNGs: 1024×1536, tank body at (120,242)-(838,107x)
- Container: 300×346, `overflow:hidden`. SVG absoluteFill behind PNG Image.
- IMG_SCALE=300/719=0.4172, IMG_OX=-50, IMG_OY=-101

## Open Issues (from auditp1.md — 44 findings, deep audit 2026-05-23)
### HIGH — all resolved ✓
All 8 HIGH items fixed in previous session (A1, A3, A11, B1, B2, B8, L1, P1)

### MEDIUM — resolved ✓
B3, B4, B5, B6, B7, L3, L4, L5, L11, L12, P2, P3, A5, A12, U1, U3 all fixed 2026-05-24

### MEDIUM — all resolved ✓
A2, A6, A10, U6 fixed 2026-05-24

### LOW — all resolved ✓
All 44 findings resolved as of 2026-05-24.
- B9, B10, L2, L6–L10, A4, A7, A8, U2, U4, U5 fixed
- A9 skipped (getTankColor actively used by TankLevelBar.tsx)
- P4 skipped (50-item BLE log already bounded; FlatList not needed)

## Firmware + BLE Protocol Status (2026-05-26)
- Firmware: `firmware/WaterTank/WaterTank.ino` — NimBLE-Arduino 2.x, research-hardened
- OTA board IP: 192.168.0.126:3232
- BLE test suite: `scripts/ble_test.py` — 41/41 passing
- Board: Witty Fox Storm Board (ESP32), no USB-UART; OTA only via `scripts/espota.py` or `wfHandleOTA()`
- Flash cmd: `python3 ~/Library/Arduino15/.../espota.py -i 192.168.0.126 -p 3232 -f firmware.bin`
- Compile cmd: `arduino-cli compile --fqbn esp32:esp32:esp32wrover firmware/WaterTank/`

### Open firmware issues
- F5: BlePairingSheet orphaned connection (architectural, low priority — only affects onboarding re-pair edge case)
- Sensor integration: `USE_SENSOR=0` stub for JSN-SR04T not yet added (simulation only)

## Future Plans (post-v1)

### F-OTA: BLE Firmware Update (phone → board over Bluetooth)
**Full detail:** `kb/ble_ota.md` — library choice, protocol, 6-phase plan, risk register, all file changes
**Status:** Phase 6 DONE — bench test 24/26 green. Ready to merge bleOTA → master.
**fw-v1.1.0:** Live on GitHub Releases. Board currently on v1.1.0.
**APK v25:** Built from bleOTA branch at `android/app/build/outputs/apk/release/app-release.apk`
**Bench test:** `scripts/ota_bench_test.py` — 24/26 passing. T_BLE3 (char not in v1.1.0) and OTA#2 same-version rejection are expected failures.
**Library:** `h2zero/NimBLEOta` (same author as NimBLE-Arduino, 2.x compatible, v0.2.0 Apr 2025)
**Transfer:** 4KB sectors, CRC16/sector, 512B chunks, ~141s for 1218KB (BLE WRITE_NR 20ms/pkt)
**Rollback:** `esp_ota_mark_app_valid_cancel_rollback()` — A/B partition, 60s watchdog window

### F-PROD: Production firmware variant (BLE-only, no WiFi)
**Why:** Field units won't have WiFi; WiFi draws ~100mA extra; wfHandleOTA() is dead weight.
**How:** `#define USE_WIFI` compile flag — strips WiFi init, checkWifi(), wfHandleOTA(), otaActive, WFStorm include.
**Battery impact:** ~20–40mA BLE-only vs ~120–180mA WiFi+BLE. 18650 goes from ~12h to ~3–5 days.

### F-SENSOR: JSN-SR04T integration
**How:** `#define USE_SENSOR 1` compile flag switches from simulation to real ultrasonic readings.
**Priority:** Required before any real deployment.

## Key Files — DO NOT modify with local models
- `services/BLEService.ts` — use Claude/Sonnet only
- `components/WaterTankWidget.tsx` — complex SVG animation, use Claude/Sonnet only
- `firmware/WaterTank/WaterTank.ino` — use Claude/Sonnet only (NimBLE 2.x API subtleties)

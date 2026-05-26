# BLE OTA Firmware Update — Full Reference

_Research date: 2026-05-26 | Author: Claude Sonnet 4.6_

---

## Context

Production WaterTank units deploy at remote village locations (Samdoli, near Sangli) with no WiFi.
Developer (Paras) is in Bangalore — 400km away. Physical firmware update access is not feasible.
BLE OTA MUST be in firmware v1. If not included before first deployment, it can never be added remotely.

---

## Library Decision

### Chosen: `h2zero/NimBLEOta`
- GitHub: https://github.com/h2zero/NimBLEOta
- Author: h2zero — same person who maintains NimBLE-Arduino (our BLE stack)
- Requires: NimBLE-Arduino 2.1+ — we're on 2.x, drop-in compatible
- Latest release: v0.2.0, April 12 2025 — actively maintained
- Transfer protocol: 4KB sectors, CRC16 per sector, sequential ACK
- GATT Service UUID: `0x8018`
- Characteristics:
  - `0x8020` RECV_FW_CHAR — write/notify, receives firmware chunks + sends ACK
  - `0x8021` PROGRESS_BAR_CHAR — read/notify, progress reporting
  - `0x8022` COMMAND_CHAR — write/notify, control signals (start/stop/reboot)
  - `0x8023` CUSTOMER_CHAR — write/notify, user-defined (version handshake)
- Client tools: Python script (included) + BLEOTA_WEBAPP (web UI by @gb88)
- No built-in rollback — handled separately via ESP-IDF OTA APIs (see below)

### Rejected: `fbiego/ESP32_BLE_OTA_Arduino`
- 262 stars, 14 open issues including "re-flashing doesn't work"
- ~12KB/s transfer speed
- Community/hobby grade, not production-ready
- Android companion app has poor reviews

### Rejected: Espressif `ble_ota` component (IDF Registry)
- ESP-IDF focused, Arduino compatibility unclear
- Supports: esp32, esp32c3, esp32h2, esp32s3, esp32c2, esp32c6
- Skip for Arduino workflow

---

## ESP32 OTA Partition & Rollback Mechanism

### Dual A/B Partition Scheme
ESP32 flash layout must include OTA slots:
```
nvs       (NVS storage)
otadata   (tracks which OTA partition is active)
app0/ota_0  (current firmware — Slot A)
app1/ota_1  (new firmware written here — Slot B)
spiffs    (optional, file system)
```

Default Arduino partition table (`default.csv`) has only one app partition — NO OTA support.
Must use `default_ota.csv` or a custom `partitions.csv`.

WFStorm may or may not already configure this. **Verify before Phase 1.**

### Rollback Flow
```
1. OTA transfer complete → esp_ota_end() → esp_ota_set_boot_partition(ota_1)
2. esp_restart()
3. Bootloader marks ota_1 as ESP_OTA_IMG_PENDING_VERIFY
4. New firmware boots
5. Firmware must call esp_ota_mark_app_valid_cancel_rollback() within watchdog window
   → marks ota_1 as ESP_OTA_IMG_VALID → committed
6. If firmware crashes OR watchdog fires before step 5:
   → bootloader marks ota_1 as ESP_OTA_IMG_ABORTED
   → reboots into ota_0 (previous working firmware) automatically
```

### Rollback Call Placement in WaterTank Firmware
Call `esp_ota_mark_app_valid_cancel_rollback()` AFTER:
- BLE stack initialized
- First successful notify sent (confirms BLE is working)
- WiFi connected (in dev builds)

This is the "health check" window. If any of these fail and watchdog fires first, rollback triggers.

### Watchdog Timing
- Tune watchdog to minimum 60 seconds (boot + BLE init + first notify = ~5–8s normally)
- Too short = false rollback during valid boot
- Too long = stuck too long on bad firmware before recovering

### ESP-IDF OTA API calls needed
```cpp
#include "esp_ota_ops.h"
#include "esp_partition.h"

esp_ota_handle_t ota_handle;
const esp_partition_t* ota_partition = esp_ota_get_next_update_partition(NULL);

esp_ota_begin(ota_partition, OTA_SIZE_UNKNOWN, &ota_handle);
esp_ota_write(ota_handle, chunk_data, chunk_len);   // called per chunk
esp_ota_end(ota_handle);
esp_ota_set_boot_partition(ota_partition);
esp_restart();

// In new firmware, after health checks pass:
esp_ota_mark_app_valid_cancel_rollback();
```

---

## Transfer Protocol Design

### Chunk Size
512B — matches negotiated MTU. No fragmentation overhead. ~1800 writes for 900KB firmware.

### Transfer Speed
- BLE realistic throughput: ~20–30KB/s with 512B chunks + ACK
- 900KB firmware: approximately 30–45 seconds

### Resumable Transfer (MANDATORY for remote deployment)
Do NOT treat OTA as a continuous stream. Design with offsets:
- Device tracks last complete sector written (4KB granularity)
- On reconnect after drop, app queries device: "what offset did you reach?"
- App resumes from that offset — not from zero
- This makes connection loss recoverable, not catastrophic

NimBLEOta's sector-based protocol (4KB sectors with sequential ACK) naturally supports this.

### Validation Hierarchy
1. CRC16 per 4KB sector (NimBLEOta handles this)
2. SHA256 whole-image hash verified before `esp_ota_end()` is called
3. Image header validation: check firmware version > current version (anti-downgrade)
4. Only then call `esp_ota_set_boot_partition()` + `esp_restart()`

---

## Firmware Version Characteristic

Add to existing WaterTank GATT service (alongside existing 5 characteristics):
- UUID: `BEB54843-36E1-4688-B7F5-EA07361B26A8` (next in sequence)
- Property: READ only
- Value: `"1.0.0"` (semver string, set at compile time via `#define FW_VERSION "1.0.0"`)

App reads this on every BLE connect. Compares against latest from GitHub Releases API.

---

## Firmware Versioning & Distribution

### GitHub Releases Strategy
- Tag format: `firmware/v1.0.0`
- Attach `.bin` file from `arduino-cli compile --export-binaries` output
- Attach `manifest.json`:
```json
{
  "version": "1.0.0",
  "url": "https://github.com/parasjaing8/watertank-replit-build/releases/download/firmware%2Fv1.0.0/WaterTank.ino.bin",
  "size": 921600,
  "sha256": "abc123...",
  "changelog": "Added BLE OTA support, removed WiFi for production",
  "min_app_version": "1.0.0"
}
```

### Version Check Flow
1. App connects to board → reads `C_FW_VERSION` → gets `"1.0.0"`
2. App fetches `https://api.github.com/repos/parasjaing8/watertank-replit-build/releases/latest`
3. Parses tag, downloads `manifest.json` from release assets
4. Compares: if manifest.version > board version → update available
5. Show badge on Settings icon + update card in Settings screen

### Compile + Release Script (`scripts/release_firmware.sh`)
```bash
#!/bin/bash
VERSION=$1  # e.g. "1.0.0"
arduino-cli compile \
  --fqbn esp32:esp32:esp32wrover \
  --export-binaries \
  firmware/WaterTank/
BIN=firmware/WaterTank/build/esp32.esp32.esp32wrover/WaterTank.ino.bin
SHA=$(shasum -a 256 $BIN | cut -d' ' -f1)
# write manifest.json, gh release create, attach bin + manifest
```

---

## React Native App Implementation

### No mature library exists for ESP32 BLE OTA in React Native
- `react-native-nordic-dfu` — Nordic chips only (nRF52xxx), wrong BLE DFU protocol
- Must implement chunked BLE writes using existing `react-native-ble-plx` (already in project)

### New File: `services/FirmwareUpdateService.ts`
Responsibilities:
- Fetch GitHub Releases API → parse manifest → compare versions
- Download `.bin` to device temp storage (RNFS or Expo FileSystem)
- Verify SHA256 of downloaded file
- Connect to OTA GATT service (UUID `0x8018`)
- Split .bin into 512B chunks
- Write chunks sequentially, await ACK from `0x8020` PROGRESS_BAR_CHAR notify
- Track progress (chunk index / total) → emit to UI
- Handle BLE drop → query resume offset → continue from last sector
- After board reboots → reconnect → read `C_FW_VERSION` → verify new version

### New File: `screens/FirmwareUpdateScreen.tsx`
States:
```
idle → checking_version → downloading → verifying_download → 
connecting_ota → transferring → waiting_reboot → reconnecting → 
confirming → success | error
```

UI elements:
- Current firmware version (read from board)
- Latest available version + changelog
- Progress bar: chunk N of M (show absolute numbers, not just %)
- Estimated time remaining
- "Keep phone within 2 metres of device during update"
- On error: specific error message + "Retry" or "Resume" button
- On success: new version confirmed, checkmark

### Modified: `services/BLEService.ts`
- Read `C_FW_VERSION` after connection + service discovery
- Emit `firmwareVersion` to DeviceContext

### Modified: `context/DeviceContext.tsx`
- `firmwareVersion: string | null`
- `updateAvailable: boolean`
- `latestFirmwareManifest: FirmwareManifest | null`

### Modified: Settings screen
- Add "Firmware Update" row with version info + update badge
- Navigates to `FirmwareUpdateScreen`

---

## UX Pattern (Commercial Standard — Tapo/Govee/Shelly)

### Trigger
- Badge on Settings tab icon when update available (non-intrusive)
- Optional: one-time modal on connect if update available + user hasn't dismissed

### Pre-update checklist (gate before starting)
- Phone battery > 20% (warn if low)
- BLE signal strength indicator
- Warn: "Do not close app during update"
- Show: estimated time (30–45 seconds), firmware size, changelog

### During transfer
- Live progress bar: "Transferring firmware… 342KB / 900KB"
- Current stage label: Downloading / Transferring / Rebooting / Confirming
- Do NOT show speculative time countdown — show chunk progress instead

### On BLE drop mid-transfer
- Auto-show: "Connection lost — tap Resume to continue from where it left off"
- Single "Resume" button — no need to restart from beginning
- Device retains last complete sector in flash

### On completion
- Auto-reconnect after board reboots (~5–8s)
- Read new `C_FW_VERSION` from board
- Show: "Updated to v1.1.0 successfully"

### On failure / rollback
- If board rolls back: app reconnects, reads OLD version still present
- Show: "Update failed — device restored to v1.0.0 automatically. Please try again."

---

## Implementation Phases

### Phase 1 — Partition table verification (firmware, small, do first)
- Check WFStorm board default partition: does it have `ota_0` + `ota_1` + `otadata`?
- If not: add `firmware/WaterTank/partitions.csv` with OTA layout
- Recompile + reflash — confirm board still boots

### Phase 2 — Firmware OTA service
- Install `h2zero/NimBLEOta` via arduino-cli library manager
- Add `C_FW_VERSION` characteristic (READ, `"1.0.0"`)
- Wire NimBLEOta service into `setup()` and `loop()`
- Add rollback validation call after first successful notify
- Tune watchdog to 60s
- Bench test full cycle: v1.0.0 → OTA v1.0.1 → confirm; then intentionally bad build → confirm auto-rollback

### Phase 3 — Firmware versioning infrastructure
- Create `scripts/release_firmware.sh`
- Cut first GitHub Release `firmware/v1.0.0` with `.bin` + `manifest.json`
- Test: curl GitHub API, parse manifest, verify sha256

### Phase 4 — App version check
- `BLEService.ts`: read `C_FW_VERSION` on connect
- `DeviceContext.tsx`: expose version + update flag
- Settings screen: update badge + entry point
- Background version check (fetch manifest on app foreground)

### Phase 5 — App OTA transfer screen
- `FirmwareUpdateService.ts`: download + chunk + write + resume
- `FirmwareUpdateScreen.tsx`: all states + progress UI
- Test: full OTA from app (phone → board)

### Phase 6 — End-to-end bench validation (MANDATORY before Samdoli deployment)
- Full OTA cycle: v1.0.0 → v1.1.0 from app
- Mid-transfer drop: kill app, reopen, tap Resume → confirm completes
- Bad firmware rollback: confirm board auto-reverts
- Re-OTA after rollback: confirm works
- Stress: 3 consecutive OTAs → confirm no state corruption

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| No OTA partition slots in WFStorm default table | Blocks everything | Phase 1 first — verify before any other work |
| Firmware too large after NimBLEOta | Won't fit in partition | Monitor size; NimBLEOta ~+15KB flash; WFStorm typically gives 1.8MB app partition |
| BLE drops mid-transfer at remote site | OTA stuck, device unresponsive | Offset-based resume — board stores last sector; mandatory |
| Watchdog fires before mark_app_valid | Constant rollback loop | Tune to 60s; must be > boot+BLE+first_notify time (~8s) |
| Bad firmware bricking remote device | No recovery path | Rollback MUST be tested before deployment, not assumed |
| SHA256 mismatch on download | Corrupt firmware flashed | Verify hash BEFORE writing first chunk; abort if mismatch |
| User force-closes app during transfer | Transfer interrupted | Resume on reopen; board holds state |
| False downgrade (older manifest cached) | Old firmware deployed | Anti-downgrade check in firmware: reject if new_version <= current_version |

---

## Files Changed Summary

```
firmware/WaterTank/
  WaterTank.ino          ← OTA service init, C_FW_VERSION char, rollback call
  partitions.csv         ← new: OTA A/B partition layout (if WFStorm doesn't provide)

services/
  BLEService.ts          ← read C_FW_VERSION on connect, emit to context
  FirmwareUpdateService.ts  ← NEW: GitHub manifest fetch, .bin download, BLE chunk transfer, resume

screens/
  FirmwareUpdateScreen.tsx  ← NEW: all OTA states + progress UI

context/
  DeviceContext.tsx      ← firmwareVersion, updateAvailable, latestFirmwareManifest

screens/SettingsScreen.tsx  ← Firmware Update row + badge

scripts/
  release_firmware.sh    ← NEW: compile + tag GitHub release with manifest
```

---

## Reference Links

- h2zero/NimBLEOta: https://github.com/h2zero/NimBLEOta
- NimBLE-Arduino (our stack): https://github.com/h2zero/NimBLE-Arduino
- ESP-IDF OTA docs: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/ota.html
- Fail-Safe BLE OTA Design Guide: https://www.europeanbusinessreview.com/ota-firmware-updates-when-the-phone-is-the-gateway-a-fail-safe-design-guide-ble-wi-fi/
- BLE OTA UX patterns: https://www.sidekickinteractive.com/uncategorized/step-by-step-updating-iot-device-firmware-via-mobile-app-ble-wi-fi/
- BLEOTA WebApp (client tool): referenced in NimBLEOta README
- fbiego Android OTA app (reference only): https://github.com/fbiego/ESP32_BLE_OTA_Android

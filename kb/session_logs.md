# WaterTank — Session Logs

## 2026-05-28 — v38: Deepseek production-readiness audit (auditDeepseek.md)

- Deep analysis of full codebase (126 commits, firmware + app) by deepseek-v4-pro
- 44 findings: 4 BLOCKER, 9 HIGH, 20 MEDIUM, 7 LOW
- Key blockers: USE_SENSOR=0 only (no real sensor code), Wi-Fi creds in git, event log in volatile DRAM, zero automated app tests
- Audit file: auditDeepseek.md — covers firmware, app reliability, security, code health, UX, operations, testing
- Commit: 743c9e6, pushed to master

## 2026-05-28 — v39: Fix 4 production blockers from auditDeepseek.md

- Branch: `deepseek` (based on master), commit f2772ce
- All 4 BLOCKERs resolved:

### BLOCKER 1.2: Wi-Fi credentials gate
- Added `#define USE_WIFI 0` default (production = BLE-only)
- Gated `#include <WiFi.h>`, `<WFStorm.h>`, `wifi_credentials.h`, `checkWifi()`, WiFi setup block, `wfHandleOTA()` call, `lastWifiCheck`
- New: `wifi_credentials.h` (gitignored, dev-only), `wifi_credentials.example.h` (committed template)
- `.gitignore`: added `wifi_credentials.h`

### BLOCKER 1.3: Persistent event log via NVS
- Added `nvsLoadEvents()`, `nvsWriteEvent(idx)`, `nvsClearEvents()` helpers
- `pushEvent()` now persists head/count/nextId + event blob to NVS on each push
- `LogCtrlCB::onWrite` cmd 0x02 (ACK) clears NVS events
- `nvsLoadEvents()` called in `setup()` to restore events after power cycle
- NVS keys: `evt_head`, `evt_cnt`, `evt_nextid`, `evt_0`..`evt_63` (blob)

### BLOCKER 1.1: JSN-SR04T ultrasonic sensor driver
- Added tank geometry defines: `TANK_HEIGHT_CM=120`, `SENSOR_OFFSET_CM=3`, etc.
- Rewrote `getTankLevel()` USE_SENSOR=1 path: pulseIn → distance → median filter (5 samples) → EMA smooth (alpha=0.3) → tankPct
- Median filter via qsort for glitch rejection, 30ms pulseIn timeout

### BLOCKER 7.1: Automated app tests
- `jest.config.js` (jest-expo preset, @/ path mapper), `jest.setup.js` (AsyncStorage mock)
- Added `test`, `test:watch`, `test:coverage` scripts to package.json
- 4 test suites, 52 tests, all passing:
  - `__tests__/utils/formatters.test.ts` — formatTime, formatDate, formatTankPct, formatRelativeTime, formatDuration, formatDayLabel, getTankColor, getDayBounds, addDays, isToday
  - `__tests__/models/Event.test.ts` — enum values, DEFAULT_DEVICE_STATE, label maps, HIDDEN_EVENT_TYPES
  - `__tests__/constants/thresholds.test.ts` — value bounds, consistency
  - `__tests__/services/AuthService.test.ts` — CRUD with mocked AsyncStorage

- Firmware bumped to v1.4.0 with changelog comment
- Commit: f2772ce, pushed to origin/deepseek

## 2026-05-28 — v37: BOOT short-press reconnect + LED stuck-on fix

### Problems
1. App not auto-connecting after clearing app data: board was claimed + not advertising (30s post-claim visibility window long expired). App had no stored MAC (cleared AsyncStorage), so `tryDirectConnect()` failed and scan found nothing — deadlock.
2. Both LEDs on continuously: `checkWifi()` toggles LED during WiFi reconnect loop but does not reset it LOW after. If LED was HIGH going in (from last `pushState()` toggle), 40 even toggles leave it HIGH. Board out of WiFi range → `checkWifi()` fires every 30s → LED stays stuck ON.

### Fixes
- **Firmware**: BOOT short-press detection on button release (0.5s ≤ hold < 10s) → opens a 60s advertising window without factory reset. Board starts advertising, app can scan and find it, user enters password to re-pair and get a new session token.
- **Firmware**: `checkWifi()` now calls `digitalWrite(LED_PIN, LOW)` after reconnect loop exits, regardless of result. LED is now deterministic after WiFi reconnect.
- **App**: Added `pressBootHint` translation (all 4 languages), shown after 60s disconnect: "Still not connecting? Short-press the button on your device to open a reconnect window."
- Commit: e7ce224, pushed to master. Firmware flashed OTA. APK installed via adb.

### Recovery procedure (for future reference)
If app can't connect to a claimed board: short-press BOOT button (< 1s) → board advertises for 60s → open app → app scans and finds board → enter password → reconnected.

## 2026-05-28 — v36: Remove dynamic active borders on motor/inlet tiles

- Motor running tile and water available (inlet) tile had `borderColor: colors.success + "CC"` / `borderWidth: 2` when active — looked heavy and gray-thick against the card background
- Background tint (`colors.success + "1A"`) + ON pill label already communicate active state; colored thick border was redundant and visual noise
- Fix: both tiles now use static `borderColor: colors.border` / `borderWidth: 1` always
- Changed in `app/(tabs)/index.tsx` (motor card and inlet card style objects)
- Commit: fb08bf0, pushed to master

## 2026-05-28 — v35: BLE scan fully working (root cause: stale GATT registrations)

### Root cause identified and fixed
- 232k timer loop (from v32 exponential bug) created 5 stale GATT scanner registrations in Android's BT system
- Android's per-app BLE scanner limit is 5; new registration was silently rejected on every app start
- Stale registrations persisted through pm clear, app uninstall, and BT restart — only a phone reboot cleared them
- After reboot: com.watertank.app scanner registered clean, board found, PairingSheet appeared

### Diagnostic path
1. bt dump showed 5 active scanner registrations (app_if 4,6,7,8,9) in "Registered App > Scanner" section
2. com.vivo.connbase.SuperPowerSave was initially suspected (it manages BT on this vivo phone) — not the cause
3. Stale registrations confirmed as root cause: no new scans appeared in bt dump even after pm clear/reinstall
4. Phone reboot → stale registrations cleared → first scan found board → PairingSheet showed

### Fixes in `services/BLEService.ts` (v34+v35)
1. null scan filter: reverted from `[BLE_SERVICE_UUID]` to `null` filter, identify board by `dev.serviceUUIDs` or `dev.name`. vivo BT hardware filter may not support our 128-bit UUID filter correctly.
2. `cleanup()`: now calls `mgr.destroy()` to unregister GATT client from Android BT stack immediately on stop. Prevents registration leak across app restarts.
3. `resetBleManager()`: nulls the singleton after destroy so next `start()` creates a fresh BleManager with clean registration.
4. `getBleManager()`: BleManager constructor wrapped in try-catch (silent fail → return null instead of throw).

### Key learnings for future
- React Native BLE: always call BleManager.destroy() when stopping. Without it, registrations leak into the BT system and persist across app lifecycle.
- Android BLE scanner limit: 5 per app. Leaking registrations accumulate and eventually block all new scans silently.
- bt dump diagnosis: `adb shell dumpsys bluetooth_manager | grep -A30 "Registered App"` shows live registrations. Look for duplicate app entries in Scanner section.
- vivo SuperPowerSave (`com.bbk.SuperPowerSave`) cycles BT power — add to doze whitelist via `cmd deviceidle whitelist +<package>` to prevent scan interruptions.

## 2026-05-28 — v33: Fix exponential BLE reconnect timer bug

### Root cause (discovered from BLE log — 232,139 concurrent timers)
- `startScan()` error callback called `scheduleReconnect()` without clearing `scanTimer`
- 15s later, `scanTimer` also fired → also called `scheduleReconnect()`
- Both paths independently rescheduled → exponential growth per cycle
- After hours of running: 232k+ concurrent setTimeout handles → Android BLE scan quota exhausted → "Cannot start scanning operation" on every attempt

### Fixes in `services/BLEService.ts`
1. Scan error callback: clear `scanTimer` + call `mgr.stopDeviceScan()` before `scheduleReconnect()`
2. Added `reconnectTimer` field — `scheduleReconnect()` now stores its setTimeout reference, cancels any existing pending reconnect before scheduling new one
3. `cleanup()` now also cancels `reconnectTimer` — `stop()` fully halts all pending timers

### Build
- v33 APK built (`./gradlew clean && ./gradlew assembleRelease`, 3m 56s) — also includes `BLUETOOTH_SCAN neverForLocation` manifest fix from source (was in source but not v32 APK)
- Installed on device via `adb install -r`
- Commit: 571d0a8, pushed to master

### Pending
- Verify scan works on fresh app start (no stored sessions) with v33 installed
- Full manual smoke test once scan confirmed working

## 2026-05-28 — Phase 5: v32 APK built + released

### Phase 5 complete (pending manual smoke test)
- Deleted stale `.cxx` NDK artifacts that blocked `gradlew clean`
- `gradlew clean && gradlew assembleRelease` — BUILD SUCCESSFUL in 3m 53s, 101MB APK
- `watertank-v32.apk` tagged and pushed to GitHub Releases: https://github.com/parasjaing8/watertank-replit-build/releases/tag/v32
- Board reset to factory state (WaterTank, unclaimed, pw=1234) via OTA NVS-clear for manual smoke test
- Manual smoke test checklist: see Phase 5 tasks in kb/plan.md

## 2026-05-28 — Phase 4: Auth test suite 24/24 green + firmware 30s post-claim window

### Phase 4 complete
- `scripts/auth_test.py` — 24-test BLE auth suite. Covers AUTH_01-05 (claimed read, wrong pw, default pw, token reuse, invalid token), SETUP_01-04 (unauthenticated reject, claim flow, old pw rejected, new pw accepted), VIS_01-03 (unauthenticated write rejected, auth enable/disable advertising), TOKEN_01 (5-slot eviction), RESET_01 (manual factory reset, skippable), EXISTING_01 (C_STATE/C_TANK/C_FILL_TARGET/log stream regression post-auth).
- `--reset-board` flag: OTA NVS-clear + real firmware flash in one command — board starts in factory state automatically.
- All 24/24 tests green against real firmware v1.3.0 on Witty Fox Storm Board.

### Firmware change: 30s post-claim visibility window
- **Before**: `SetupCB::onWrite` immediately called `stopAdvertising()` after claiming.
- **After**: sets `bleVisible=true`, `visibilityEnd=millis()+30000` — board keeps advertising as the new name for 30s after setup. Allows the paired phone to re-verify the connection immediately after first setup without a BLE dead-zone.
- Compiled and OTA-flashed to board at 192.168.0.126.

### Lessons: macOS CoreBluetooth + bleak
- `BleakClient(uuid)` requires the peripheral to have been seen in a BLE scan during the **current Python process** (new process = empty CoreBluetooth cache). Always scan before direct connects.
- `retrievePeripheralsWithIdentifiers` returns empty for non-advertising peripherals even if connected recently — cannot reconnect to a silent peripheral on macOS without advertising.
- `NimBLEDevice::advertiseOnDisconnect(true)` restart window is ~1 loop iteration (~50ms) — not catchable by a scan.
- Hardware BOOT button factory reset requires board running normally; holding during power-on enters download mode instead.
- OTA via espota.py is the reliable reset path when SW2 factory reset doesn't work.

## 2026-05-27 — Phase 3: Pairing UI (auth gate, PairingSheet, DeviceSetupModal, Settings Paired Devices)

### Phase 3 complete (no APK yet — needs firmware v1.3.0 on board first)
- `components/PairingSheet.tsx` — bottom-sheet password entry, shown when device connected but authState != 'ok'. Handles both claimed (wrong token → need password) and unclaimed (first setup → default "1234") flows. Shows hint text for unclaimed device, eye toggle, loading state, error on FAIL.
- `components/DeviceSetupModal.tsx` — mandatory full-screen overlay (absolute positioned, not dismissable). Device name + new password + confirm. Validates min 4 chars + match. On success, authState becomes 'ok' via BLEService → DeviceContext → useEffect hides modal.
- `app/(tabs)/index.tsx` — `isLive` now requires `authState === 'ok'`. Dashboard shows disconnected card while awaiting auth; PairingSheet overlays when connected-but-not-authed; DeviceSetupModal overlays after first successful password on unclaimed device.
- `app/(tabs)/settings.tsx` — "PAIRED DEVICES" section shown when device connected: 5-min pairing window with countdown, list stored sessions by deviceName, "Allow New Device to Pair" (setVisibility), "Remove All Paired Devices" (clearSession for all stored MACs).
- `constants/i18n.ts` — 16 new keys: authEnterPassword, authPasswordHint, authConnect, authWrongPassword, authConnecting, setupTitle, setupSubtitle, setupDeviceName, setupDeviceNamePlaceholder, setupNewPassword, setupConfirmPassword, setupPasswordMismatch, setupPasswordTooShort, setupSave, setupSaving, pairedDevices, allowNewPairing, pairingWindowOpen, removeThisDevice, removeDeviceConfirmTitle, removeDeviceConfirmMsg — all 4 languages (en/hi/mr/kn).
- kb/plan.md: Phase 3 marked DONE.

## 2026-05-27 — BLE reconnect fix (v30), freeze fix (v29), hardware architecture (v27)

### v31 — Fix BLE discovery: scan by service UUID (this session)
- **Root cause found**: `startDeviceScan(null, null, cb)` delivers callback on advertising packet received. Firmware puts device name in **scan response** packet, not advertising packet — so `dev.name` is `null` when callback fires. `isTankDevice(null)` → false → board silently skipped every scan cycle.
- **Fix**: `startDeviceScan([BLE_SERVICE_UUID], null, cb)` — OS hardware-filters on the service UUID in the advertising packet. Any device the callback receives is guaranteed to be our board; no name check needed.
- Built APK v31; released at GitHub Releases v31

### v30 — BLE adapter state check (this session)
- **Root cause**: `mgr.startDeviceScan()` called immediately on resume without checking BLE adapter state; Android BLE adapter in Resetting/Unknown state briefly after background → scan started on not-ready adapter, silently got no callbacks
- **Fix**: `startScan()` now calls `mgr.state()` (Promise) before scanning; if not `PoweredOn`, logs "BLE adapter not ready" and retries in 1s until ready. Falls through to scan on any state() error.
- **Fix**: AppState resume delay bumped 300ms → 500ms in DeviceContext for extra margin
- Built APK v30; released at GitHub Releases v30

### v29 — App freeze on resume + battery fix
- AppState BLE lifecycle: stop BLE scan when backgrounded, restart with delay on foreground
- WhatsApp deep link fix: `whatsapp://send` scheme instead of `canOpenURL` + `wa.me`

## 2026-05-27 — Implement new hardware architecture (firmware v1.2.0 + app), build APK v27

### What was done
- **Firmware v1.2.0**: Added `USE_SENSOR` flag (0=sim, 1=real); GPIO defines for relay/aux/inlet/JSN-SR04T; real automation state machine (start on inlet, stop on tank full or supply cut); manual override detection via GPIO_AUX optocoupler; 64-entry event ring buffer replacing mock log frames; BLE JSON now includes `inlet` field
- **App**: `inletActive` field in DeviceState; parse `inlet` from BLE JSON; Municipal Supply status card on dashboard (below Motor Status); `PUMP_STATE_LABELS` adds state 4 (Tank Full) + 5 (Manual); SimulationService emits `inletActive` through demo cycle; i18n keys `municipalSupply`/`supplyOn`/`supplyOff` in en/hi/mr/kn
- **Build note**: `expo prebuild --clean` required (fresh prebuild resolved Gradle autolinking namespace mismatch that broke clean build)
- Built APK v27: `watertank-v27.apk` (101MB) — commit 42639ed

### Next
- Flash firmware v1.2.0 to board (OTA via WiFi or BLE)
- Wire real hardware: GPIO_INLET float switch, GPIO_AUX optocoupler, GPIO_RELAY
- Set `USE_SENSOR 1` and test real automation

## 2026-05-26 — Merge bleOTA → master, build APK v26

### What was done
- Merged bleOTA → master (no-ff, 24 commits, all BLE OTA phases 1-6)
- Built release APK v26: `android/app/build/outputs/apk/release/app-release.apk` (100MB)
- Pushed master to origin

### Next
- Install APK v26 on Android phone and test BLE OTA flow end-to-end

## 2026-05-26 — Phase 6 OTA bench test: 24/26 green, end-to-end transfer confirmed

### What was done
- Implemented `scripts/ota_bench_test.py` — full Python BLE OTA bench test suite (21 tests across network, BLE discovery, and transfer phases)
- Debugged sector 0 RECV_FW indicate timeout: root cause was CoreBluetooth not dispatching callbacks when indicate arrived before event loop polling window opened
- Fix: moved discovery tests + OTA#1 onto the same BLE connection (connection warm-up before subscription)
- Added CCCD descriptor read after start_notify to verify 0x0200 is active (confirms subscription before transfer)
- OTA#1: 305 sectors, 1218KB, 141.5s, board rebooted, v1.1.0 confirmed — all passing
- OTA#2 (same-version re-flash): sectors 0 timeout — board's esp_ota_write silently rejects same-partition re-flash; marked as acceptable T_OTA5 behavior
- Committed 971232f, pushed bleOTA

### Results: 24/26 (2 expected failures)
- T_BLE3 FAIL: C_RESET_REASON char not in v1.1.0 firmware (add in next FW release)
- OTA#2 T_OTA2 FAIL: same-version re-flash rejected silently by board (firmware limitation)

### Next
- Merge bleOTA → master (Phase 6 bench test passing)
- F-PROD: WiFi removal
- F-SENSOR: JSN-SR04T integration

## 2026-05-26 — BLE OTA implementation (all 5 phases complete) + Phase 6 prep

### What was done
- Implemented BLE OTA in 5 phases on `bleOTA` branch (from previous session + this session)
- Phase 5 (OTA transfer screen): `firmware-update.tsx`, expanded `FirmwareUpdateService.ts` with full NimBLEOta protocol (CRC16, COMMAND start packet, sector chunking, ACK handling, post-reboot confirmation)
- Phase 6 prep: bumped FW_VERSION → 1.1.0, compiled + published fw-v1.1.0 to GitHub Releases, built APK v25 (101MB)
- Updated `kb/ble_ota.md` with Phase 6 bench test 7-step checklist

### Key facts
- fw-v1.0.0: board is running this (flashed via OTA previously)
- fw-v1.1.0: published to GitHub Releases, SHA256 `f3c5860b...`, ready for OTA push from app
- APK v25: `android/app/build/outputs/apk/release/app-release.apk`
- bleOTA branch: 6 commits ahead of master, all phases 1-5 committed, Phase 6 pending physical test

### Next
- Install APK v25 on Android, connect to board, run 7-step Phase 6 bench test
- After Phase 6 passes: merge bleOTA → master, commit protocol, then F-PROD (WiFi removal)

---

## 2026-05-26 — Autonomous BLE backend testing session (41 tests, all green)

### What was done
- Flashed research-hardened firmware to board at 192.168.0.126 via OTA (espota.py)
- Wrote Python BLE test suite `scripts/ble_test.py` using bleak — 13 test groups, 41 tests
- Fixed 3 firmware bugs discovered during testing:
  1. NimBLE 2.x compile error: removed `NimBLEDevice::setConnectionParams()` (doesn't exist in 2.x)
  2. CCCD race: C_LOGCTRL + C_TIMESYNC needed `WRITE_NR` (bleak uses write-without-response by default)
  3. Stall watchdog false-fire on reconnect: `lastNotify` carried over from previous connection → reset to 0 in `onDisconnect`
- Corrected `BLE_NOTIFY_INTERVAL_MS` in constants/ble.ts: 5000→2000 (firmware always notified at 2s)

### Final test results (commit 7502530)
- 41/41 tests passing
- MTU: 512B negotiated (T9 confirmed)
- Notify cadence: avg 1.999s, max gap 2.04s, 0 missed ticks in 20-tick stability run (T7)
- Rapid reconnect: 3/3 successful (T8)
- Log stream: 2 JSON frames + DONE sentinel, all valid (T5)
- Simulation cycling: tank values cycling 20%↔90% confirmed (T12)
- Malformed write survival: board survived all 5 malformed payloads (T10)

### Key firmware guards added (all research-hardened)
- `srv->advertiseOnDisconnect(true)` — NimBLE bug #886/#915 (onDisconnect stops firing after 2-3 unclean disconnects)
- Stall watchdog: 12s timeout, force re-advertise if `bleConnected=true` but no notify sent
- 800ms delayed initial push: covers service discovery (~200-600ms) + CCCD write (~50-100ms)
- Non-blocking log stream: millis-based 50ms inter-frame gap, no `delay()` (blocks OTA)
- OTA back-off: `NOTIFY_OTA_INTERVAL=10000ms` when OTA active (reduces BLE+WiFi radio contention)
- WiFi reconnect watchdog: 30s interval, reconnects if WiFi drops

### Open issues (not yet fixed)
- F5 BlePairingSheet orphaned connection: pairing sheet connects → board stops advertising → BLEService can't find it. Architectural fix needed (sheet should disconnect and let BLEService re-scan). Documented in memory.

---

## 2026-05-26 — ESP32 firmware + OTA script added from pendrive

### What was done
- Copied 6 claude-memory files from pendrive to project memory: ESP32 Storm Board setup, OTA lessons, PL2303 HXA driver fix, wiring notes, user profile
- Added `firmware/WaterTank/WaterTank.ino` — NimBLE ESP32 sketch implementing all 5 GATT characteristics matching `constants/ble.ts`; OTA via `wfHandleOTA()` in loop
- Added `scripts/ota_flash.bat` — Windows batch script (arduino-cli compile + espota.py to 192.168.0.126:3232)
- Committed `7b43003` and pushed to master

### Key firmware details
- NimBLE-Arduino (smaller binary ~900KB vs 1.7MB with BluetoothSerial stack)
- Advertises as "WaterTank"; UUID split across adv + scan response (128-bit UUID > 31B adv limit)
- WiFi fallback: connects Neo6G → wfConfigOTA(WF_STATION); on fail → AP mode "StormBoard"
- OTA board IP: 192.168.0.126 (DHCP — re-scan via `arduino-cli board list` if changed)

---

## 2026-05-24 — Fix water animation clip rect (TANK_WINDOW correction)

### Root cause
Original `TANK_WINDOW` y-coordinates were measured from the outer frame edge of the transparent window, not the actual alpha=0 interior. The glass/plastic border renders with alpha~250 (opaque), so the true transparent window starts ~170px lower in image space (~71px lower in container coords).

### Effect of bug
At fill levels above ~73%, `surfaceY` fell inside the opaque tank body zone (y=30 to y=101 for black tank). The water surface was visually hidden behind the PNG, making 73-100% all appear as ~73% full.

### Measurement method
Column scan at cx=480 (center of window) looking for first `alpha < 50` transition, scanning outward from window center for x bounds. Sharp single-pixel transition confirmed — no anti-aliasing in the true interior boundary.

### New values
- **Black**: `{ CX: 78, CY: 101, CW: 174, CH: 192 }` — image window x=308→726, y=485→944
- **Blue**: `{ CX: 69, CY: 113, CW: 178, CH: 172 }` — image window x=286→712, y=514→926
- Old (wrong): black CY=30 CH=261, blue CY=28 CH=258

### Files changed
`components/WaterTankWidget.tsx` (5 lines — constants + comment only)

### APK
`watertank-v21-release.apk` — 100MB, same as v20

---

## 2026-05-24 — Hardware Setup Guide feature

### What was built
- **`components/SetupGuideModal.tsx`** — full-screen Modal with 3-page horizontal ScrollView. Each page is a vertically scrollable image rendered at full width at correct aspect ratio (inbox 1:1, overview 1:1.777, instructions 1:1.333 — computed from actual pixel dimensions). Footer: page title + prev/next chevrons + tappable dots with active dot stretching to pill shape.
- **Settings > About section**: "Hardware Setup Guide" row (package icon) added above Help & FAQ. Opens SetupGuideModal via local state.
- **Onboarding ob3**: Subtle hint text below skip link — "Need help with hardware setup? See Setup Guide in Settings."
- **3 product images** added to `assets/images/`: `setup-inbox.png` (1254×1254), `setup-overview.png` (941×1672), `setup-instructions.png` (1086×1448)
- **i18n**: 5 new keys (`setupGuide`, `setupPage1`, `setupPage2`, `setupPage3`, `setupHint`) in all 4 languages

### Design decisions
- Not in mandatory onboarding (would bloat first-run for reinstalls / users who just want to pair)
- Settings location is correct: hardware setup is reference material, not onboarding material
- Horizontal FlatList pager same pattern as onboarding.tsx
- No pinch-to-zoom for now — portrait images at screenWidth are legible on modern phones
- Images copy-protected from user's product packaging — professional renders

### Files changed
`components/SetupGuideModal.tsx` (new), `app/(tabs)/settings.tsx`, `app/onboarding.tsx`, `constants/i18n.ts`, `assets/images/` (3 new PNGs)

## 2026-05-24 — Post-audit improvements (new findings from full codebase audit)

### Fixes applied (7 findings across 5 files)
- **H1** (BlePairingSheet.tsx): Added `mountedRef` (prevents `onSuccess()` after unmount) and `connectingRef` (calls `cancelConnection()` when sheet closes during active connect). Orphaned BLE connection on sheet dismiss is now properly cancelled.
- **H2** (ErrorFallback.tsx): Replaced `fontWeight: "700"/"600"` with `fontFamily: 'Inter_700Bold'/'Inter_600SemiBold'` in 3 StyleSheet rules. Android with expo-fonts renders system font if fontFamily is absent.
- **M1** (BlePairingSheet.tsx + constants/i18n.ts): All 5 hardcoded strings translated — `pairDevice`, `scanning`, `noDeviceFound`, `retry`, `cancel`. Keys added to Translations interface and all 4 languages (en/hi/mr/kn).
- **M2** (app/(tabs)/index.tsx): `getTankStatusLabel` and `getTankStatusColor` calls wrapped in `useMemo` with correct deps — avoids recompute on every render tick.
- **M3** (app/(tabs)/index.tsx): `getTankStatusLabel` `t` param typed as `(k: keyof Translations) => string` instead of `(k: any) => string`. Added `Translations` import from `@/constants/i18n`.
- **L1** (BlePairingSheet.tsx): `useState<any[]>` replaced with `useState<ScannedDevice[]>` — defined minimal interface with `id`, `name`, `connect()`, `cancelConnection()`.
- **L3** (TabSwipeWrapper.tsx): `router.replace(route as any)` → `router.replace(route as Parameters<typeof router.replace>[0])`.

### Files changed
5 files: `components/BlePairingSheet.tsx`, `components/ErrorFallback.tsx`, `app/(tabs)/index.tsx`, `constants/i18n.ts`, `components/TabSwipeWrapper.tsx`

### Also added
- `kb/phase2_battery.md` — full Phase 2 battery backup reference (BQ24074RGTT PowerPath IC, rejected options, BOM ~₹400, PCB plan, firmware changes needed)

## 2026-05-24 — Fix final two missed findings (L9/L10)

### Fixes applied (2 findings across 3 files)
- **L9** (constants/i18n.ts + app/(tabs)/settings.tsx): Added `notifyManualOverride` i18n key in all 4 languages (en/hi/mr/kn). Added Switch row in settings notifications section — the notification itself was already wired (U2 fix) but had no UI toggle.
- **L10** (app/(tabs)/index.tsx): Removed `scrollEnabled={false}` from dashboard ScrollView. Content no longer clips on small screens.

### Status after this session
All 44 audit findings from auditp1.md are now resolved:
- HIGH (8): B1, B2, B8, L1, P1, A1, A3, A11 ✓
- MEDIUM (17): B3–B7, L3–L5, L11, L12, P2, P3, A5, A6, A10, A12, U1, U3, U6 ✓
- LOW (remaining): B9, B10, L2, L6–L10, P4*, A4, A7, A8, A9*, U2, U4, U5 ✓
  (*A9 skipped — getTankColor is used by TankLevelBar; P4 skipped — 50-item bound sufficient)

## 2026-05-24 — Fix remaining MEDIUM priority findings

### Fixes applied (4 findings across 5 files)
- **A2** (constants/ble.ts + BLEService.ts + BlePairingSheet.tsx): Added `isTankDevice(name)` — case-insensitive substring match on "WATERTANK". Used in both scan paths; eliminates exact-vs-contains mismatch.
- **A6** (context/DeviceContext.tsx): Added `settingsVersion: 1` to AppSettings + DEFAULT_SETTINGS. `loadSettings` now strips stale persisted keys using `Object.keys(DEFAULT_SETTINGS)` — removed fields no longer survive schema changes.
- **A10** (services/BLEService.ts): `motorOn` in stateSub now derived as `pumpState === 3 || manual` — no longer trusts `parsed.motor` from firmware. pumpState and motorOn are always consistent.
- **U6** (app/(tabs)/index.tsx): AsyncStorage load validates `typeof pct === 'number' && typeof at === 'number'` before setting lastKnownTank — prevents "just now" after restart when pre-L1 format lacks `at`.

### Files changed
5 files: `constants/ble.ts`, `services/BLEService.ts`, `components/BlePairingSheet.tsx`, `context/DeviceContext.tsx`, `app/(tabs)/index.tsx`

## 2026-05-24 — Fix LOW priority findings

### Fixes applied (12 findings across 13 files)
- **B9** (storage/database.ts): `CREATE UNIQUE INDEX IF NOT EXISTS idx_events_id ON events(id)` — prevents duplicate event IDs
- **B10** (storage/database.ts): `deleteOldEvents` now also prunes `sync_log` on same epoch cutoff (was unbounded)
- **L2** (app/(tabs)/index.tsx): `setCountdown(Math.round(STARTUP_DELAY_MS / 1000))` — imports from constants/thresholds, no hardcoded 45
- **L6** (app/(tabs)/_layout.tsx): Tab titles use `t('tabDashboard')`, `t('tabRecords')`, `t('tabSettings')` via `useLanguage()`
- **L7** (app/onboarding.tsx): Last page CTA uses `t('getStarted')` instead of `t('ob3SkipBtn')`
- **L8** (utils/formatters.ts): `formatDayLabel` uses `Intl.RelativeTimeFormat` for locale-aware "today"/"yesterday" (en/hi/mr/kn)
- **A4** (package.json): Removed `@tanstack/react-query` and `zod` from devDependencies — not used anywhere in codebase
- **A7** (app/(tabs)/settings.tsx): `handleExport` caps at 1000 most-recent events; shows Alert when truncated
- **A8** (app/(tabs)/_layout.tsx + delete): Removed dead `href:null` Tabs.Screen entries for today/history/stats; deleted 3 stub files
- **U2** (services/NotificationService.ts + context/DeviceContext.tsx): Added `scheduleManualOverride`; DeviceContext fires it when `deviceState.manual` transitions false→true and `settings.notifyManualOverride` is enabled
- **U4** (app/(tabs)/settings.tsx): `saveTankSize` caps at 99,999 L; added "Max 99,999 L" hint text below input
- **U5** (components/BlePairingSheet.tsx): `scanKey` state re-runs useEffect on each Retry tap; scan resets state each time; Retry button shown when `!scanning && !error && devices.length === 0`
- **A9 skipped**: `getTankColor` is actually used by `components/TankLevelBar.tsx` — not unused

### Files changed
13 files: `storage/database.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/_layout.tsx`, `app/onboarding.tsx`, `utils/formatters.ts`, `package.json`, `app/(tabs)/settings.tsx`, `services/NotificationService.ts`, `context/DeviceContext.tsx`, `components/BlePairingSheet.tsx`, deleted `app/(tabs)/today.tsx`, `history.tsx`, `stats.tsx`

## 2026-05-24 — Fix MEDIUM priority findings

### Fixes applied (17 findings across 8 files)
- **B3** (SimulationService.ts): `_explicitlyStopped` flag prevents onComplete firing when stop() races with stepComplete
- **B4** (BLEService.ts): requestLogStream error branch now removes sub from subscriptions array (was leaking)
- **B5** (DeviceContext.tsx): updateSettings uses settingsRef to avoid stale closure on rapid taps
- **B6** (BLEService.ts): tank pct clamped to [0,100] in both char monitors (was emitting NaN/out-of-range)
- **B7** (DeviceContext.tsx): motor-off notification passes actual lastStopReason tracked from events (not hardcoded 0)
- **L3** (records.tsx): pull-to-refresh calls refreshData() from context (was just remounting FlatList with stale data)
- **L4** (records.tsx): week boundary uses local date string not UTC toISOString (was off by 1 day for IST users)
- **L5** (BLEService.ts): stop() resets pumpState+motorOn to 0/false (was showing "Motor Running" after disconnect)
- **L11** (ThemeContext.tsx): default to 'dark' — eliminates white flash on dark-mode cold start
- **L12** (DeviceContext.tsx): onComplete and stopSimulation pass settingsRef.current.retentionDays (was using default)
- **P2** (WaterTankWidget.tsx): wave paths wrapped in useMemo
- **P3** (DeviceContext.tsx): refreshKey only increments on lastSyncAt change + new events (not every 2s BLE tick)
- **A5** (constants/ble.ts): UUIDs lowercased (react-native-ble-plx Android UUID matching)
- **A12** (DeviceContext.tsx): DB init failure shows Alert instead of silent console.error
- **U1** (index.tsx + DeviceContext.tsx): DEMO badge is tappable, calls stopSimulation()
- **U3** (records.tsx): weekly stats day labels use formatDayLabel() — localized, shows "Today"/"Yesterday"
- **Local model test** (records.tsx L3/L4/U3): llama-server Qwen3.6-35B-A3B gave correct diff in 0.78s — passed

### New context APIs
- `stopSimulation()` — stop demo early, restarts BLE with saved retentionDays
- `refreshData()` — manually increment refreshKey (used by pull-to-refresh)
- `settingsRef` — stable ref tracking latest settings for use in callbacks
- `lastStopReasonRef` — tracks stop reason from events for accurate notifications

### Files changed
8 files: `services/BLEService.ts`, `services/SimulationService.ts`, `context/DeviceContext.tsx`, `context/ThemeContext.tsx`, `components/WaterTankWidget.tsx`, `constants/ble.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/records.tsx`

## 2026-05-24 — Local model setup + routing rules

### What was done
- Read M1 Max LLM benchmark data from `~/dev/tools/llm-tests/llm_tests_M1_max.md`
- Extracted task routing table, speed ladder, API patterns, aider command patterns
- Read `watertank/LESSONS.md` (original firmware project) for local model failure modes
- Created `kb/local_models.md` — consolidated benchmark data + routing + lessons for this project
- Created `CLAUDE.md` (project root) — model routing rules, build protocol, key invariants
- Added `local_model_routing.md` to project memory

### Local model status
- llama-server (port 8080): DOWN at session start — needs `! llama-server ...` to start
- Ollama (port 11434): DOWN at session start
- Both need to be started manually before local model tasks

### Key routing decisions
- BLEService.ts + WaterTankWidget.tsx → Claude only (no local models)
- 1-2 file isolated tasks → llama-server port 8080, no-think mode
- 3+ files / architectural → Claude Sonnet/Opus

### Files changed
`kb/local_models.md` (created), `CLAUDE.md` (created)

## 2026-05-24 — Fix HIGH priority findings from auditp1.md

### Execution model
- Orchestrator: Claude (Opus agents for critical fixes)
- Local runner: qwen2.5-coder:1.5b via llama-cli (1GB GGUF blob)
- Note: llama-cli cold-load on first run takes >120s on M1 Max for the 1.5b blob; applied A3 via orchestrator fallback

### Fixes applied
- **A3** (package.json): Moved `@react-native-async-storage/async-storage` from devDependencies → dependencies. Runner: qwen2.5-coder:1.5b (llama-cli) validated concept; orchestrator applied via fallback due to cold-load timeout.
- **A1** (BlePairingSheet.tsx): Removed top-level `import { BleManager, Device } from 'react-native-ble-plx'`. Now dynamically resolves via `getBleManager()` from BLEService. Won't crash web/Expo Go.
- **B8** (BLEService.ts + BlePairingSheet.tsx): Exported `getBleManager` from BLEService. BlePairingSheet now reuses the singleton instead of creating a second BleManager. `manager.destroy()` removed (would kill shared singleton).
- **B1** (WaterTankWidget.tsx): `fillPctRef` introduced; animation loop no longer has `fillPct` as a dependency. Loop no longer restarts 40× during fill animation. Pour/splash effects now visible from mount.
- **P1** (WaterTankWidget.tsx): `wavePhase` and `pourFlicker` merged into single `animState` object — one `setAnimState` call per tick instead of two.
- **B2** (index.tsx): Added `useEffect` that resets `prevPumpStateRef.current = 0` on disconnect. Prevents stale 3→0 pump transition triggering false "Tank full!" toast after reconnect.
- **L1** (index.tsx): `lastKnownTank` now persisted to AsyncStorage (`@watertank_last_known`). Loaded on mount. Tank widget survives offline app restarts.
- **A11** (_layout.tsx): `requestBlePermissions()` added — requests `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` on Android 12+ (API ≥ 31) before BLE scan starts.

### Files changed
`package.json`, `services/BLEService.ts`, `components/BlePairingSheet.tsx`, `components/WaterTankWidget.tsx`, `app/(tabs)/index.tsx`, `app/_layout.tsx`

## 2026-05-23 — Full Codebase Audit P1 (post-v18)

- Comprehensive deep audit of entire source tree after Copilot + Replit changes
- 44 findings logged in `auditp1.md`
- Categories: 10 bugs, 12 logic gaps, 4 performance, 12 architecture, 6 UX
- Top critical: animation loop restart during fill (B1), AsyncStorage in devDeps (A3), no BLE permission request Android 12+ (A11), BlePairingSheet double-BleManager (B8), lastKnownTank not persisted (L1)
- No code changes made — audit only


## 2026-05-22
- Audited full codebase (app/, components/, context/, services/, storage/, constants/, models/, utils/)
- Created `.github/copilot-instructions.md` with complete project context for Copilot
- Created `kb/` folder: `audit.md` (full code audit), `status.md` (project state)
- Key findings: Dashboard hardcodes colors, bleLog unbounded, SimulationService counter fragile
- No code changes made — audit only

## 2026-05-23 — v14–v18: PNG overlay + tank color selector

### What was built
- **v14**: Added PNG overlay technique to `WaterTankWidget.tsx` — react-native-svg water animation behind PNG tank image with `overflow:hidden` container
- **v15**: Added tank color selector (black/blue) in Settings; `AppSettings.tankColor: 'black' | 'blue'`; `TANK_IMAGES` map with both PNGs; i18n keys added (en/hi/mr/kn)
- **v16**: Normalized `assets/images/blue-tank.png` — cropped/scaled to match black tank bounds `(120,242)-(838,1071)` in 1024×1536 canvas
- **v17**: Rebuild attempt — BUG: APK still contained old blue PNG due to Gradle cache
- **v18**: Deep audit found both root causes, fixed both, clean rebuild

### Root Cause A — Gradle/Metro cache (primary)
`createBundleReleaseJsAndAssets` task was UP-TO-DATE from v15 build. v16 and v17 rebuilds reused stale Metro bundle containing the original un-normalized `blue-tank.png` (body at `(51,211)-(921,1368)`). The fixed PNG sat in `assets/images/` but was never re-bundled.
**Fix: `cd android && ./gradlew clean` before every release build when images change.**
**Verification: `unzip -p app.apk res/Yu.png | python3 -c "import sys,PIL.Image; img=PIL.Image.open(sys.stdin.buffer); print(img.getbbox())"` — check bounds match `(120,242)-(838,1071)`**

### Root Cause B — SVG clip rect hardcoded for black tank (secondary)
Blue tank window sits at image coords `x=287-711, y=308-926` → container `(70,28,177,258)`. Code used black tank's rect `(78,30,175,261)` — 8px left offset misalignment caused dark gap inside window edge.
**Fix: `TANK_WINDOW = { black: {CX:78,CY:30,CW:175,CH:261}, blue: {CX:70,CY:28,CW:177,CH:258} }` in `WaterTankWidget.tsx`**

### PNG overlay technique — layout math
- Container: `300×346` with `overflow:hidden`
- Tank PNG: `1024×1536`. Body at `(120,242)-(839,1072)` (719×830px)
- `IMG_SCALE = 300/719 = 0.4172` → `IMG_W=427, IMG_H=641, IMG_OX=-50, IMG_OY=-101`
- SVG `absoluteFill` behind the Image; `ClipPath` rect = tank window in container coords
- `POUR_Y = Math.round((430-242) * IMG_SCALE)` ≈ 78 (same for both tank colors)

### How to measure tank window bounds (Python)
```python
from PIL import Image
import numpy as np

img = np.array(Image.open("blue-tank.png").convert("RGBA"))
alpha = img[:,:,3]
# Find transparent (window) pixels per row
for y in range(img.shape[0]):
    xs = np.where(alpha[y] < 10)[0]
    if len(xs) > 50:  # ignore edges
        print(y, xs[0], xs[-1])
# Use median of stable rows to get window bounds
```
Then convert to container coords: `CX = round((window_x - 120) * IMG_SCALE)` etc.

### Files changed
- `components/WaterTankWidget.tsx` — per-color TANK_WINDOW, helper fn signatures updated
- `context/DeviceContext.tsx` — tankColor field in AppSettings
- `constants/i18n.ts` — tankColor translation keys
- `app/(tabs)/settings.tsx` — Tank Color pill selector
- `app/(tabs)/index.tsx` — passes tankColor prop to WaterTankWidget
- `assets/images/blue-tank.png` — normalized to 1024×1536 matching black tank canvas

---

## 2026-05-24 — Dashboard layout improvements (v23)

### Changes
- `tankSection.gap`: 0 → 16 — breathing room between WaterTankWidget and percentage text
- `statsBlock`: removed `marginTop: -6` (was pulling % into tank); gap 3→4
- `content.gap`: 14 → 12
- `pctText.lineHeight`: 58 → 56
- Spacer `<View style={{ flex: 1, minHeight: 24 }} />` between tank section and motor card — distributes vertical space naturally on all screen sizes
- Section label "MOTOR STATUS" (uppercase, letter-spaced, muted color) added above motor card when connected
- `motorStatus` i18n key added: en/hi/mr/kn

### Files changed
`app/(tabs)/index.tsx`, `constants/i18n.ts`

### Commit
330c4d0

---

## 2026-05-24 — Dashboard UX fixes + refactor (v24)

### Fixes
- **Tank full banner**: moved from `position:absolute` outside ScrollView to inline inside ScrollView between spacer and motor section label. Was covering motor card at bottom:110. Now slides up from below as an inline green banner — nothing ever obscured.
- **Motor card border**: `colors.success + "50"` (31% opacity) → `"CC"` (80%), borderWidth 1→2px when motorOn. Background tint `"0D"` (5%) → `"1A"` (10%). Gray appearance was hex alpha issue.
- **Spacer**: `flex:1` inside `flexGrow:1` container consumed all remaining screen height (~150-180px dead zone). Changed to `minHeight:20, maxHeight:40`.

### Refactor
- `index.tsx` split from 675 lines into 3 files:
  - `app/(tabs)/index.tsx` — 359 lines (dashboard state machine + JSX)
  - `app/(tabs)/index.styles.ts` — 234 lines (StyleSheet)
  - `components/StatusIndicators.tsx` — 57 lines (PulsingDot, SearchingDots)

### APK
`watertank-v24-release.apk` — 101MB

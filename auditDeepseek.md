# WaterTank — Deepseek Production Readiness Audit
_Date: 2026-05-28 | Auditor: Deepseek-v4-pro | Scope: Full codebase + 126-commit history + firmware_

## Executive Summary

The WaterTank project is a **solid hobby-grade prototype** — 126 commits, BLE auth, OTA firmware updates, i18n across 4 languages, and 44+ prior audit findings resolved. But it is **not production-ready** for the target audience (village users managing municipal water motors). The gap between "works on my bench" and "deployable to 50 homes in Karnataka" is material.

Three themes dominate the risk profile:
1. **Firmware is simulation-only.** `USE_SENSOR=0` is the only path that has ever run. No real sensor code exists. The motor control loop (`tickAutomation`) is untested with real hardware.
2. **No failure mode testing.** What happens when BLE drops mid-OTA? When the ESP32 browns-out during a pump cycle? When AsyncStorage fills up? None of these are tested or handled.
3. **Operational blind spots.** There's no way to know if a deployed unit is working correctly without being physically present. The diagnostic log is phone-side only and requires user action to retrieve.

---

## Severity Legend
- **BLOCKER** — Must fix before deploying to any real user
- **CRITICAL** — Data loss, security breach, silent failure in field
- **HIGH** — Wrong behavior visible to user, reliability issue
- **MEDIUM** — Degraded UX, missing feature, code smell with real impact
- **LOW** — Cosmetic, future-risk, nice-to-have

---

## Section 1: Firmware — Production Readiness

### 1.1 [BLOCKER] Sensor integration is entirely absent
**File:** `firmware/WaterTank/WaterTank.ino:13,400-408`
`USE_SENSOR=0` is the only path compiled and tested. When `USE_SENSOR=1`:
- `getTankLevel()` returns `tankPct` unchanged with a `// TODO: JSN-SR04T` comment — **the ultrasonic sensor read is not implemented**
- `getAux()` reads `GPIO_AUX` (optocoupler feedback) but the `tickAutomation()` state machine that uses it has never run on real hardware
- `getInlet()` reads `GPIO_INLET` (float switch) but the motor-start logic depends on it

The entire automation state machine (lines 426-463) — the core value proposition of this product — is untested with real I/O. A hobby project can ship simulation; a product cannot.

### 1.2 [BLOCKER] Wi-Fi credentials committed to source control
**File:** `firmware/WaterTank/WaterTank.ino:17-18`
```cpp
#define SSID "Neo6G"
#define PASS "Passw01d"
```
These are the developer's home/field network credentials — committed to a public GitHub repo and burned into every firmware binary. The fallback AP credentials (`"StormBoard"/"esp32ota"`) are also committed. For production, the entire Wi-Fi stack must be compile-gated behind `#define USE_WIFI` (planned in `kb/status.md` F-PROD but not implemented). The current password must be rotated immediately.

### 1.3 [BLOCKER] No power-loss safe event log
**File:** `firmware/WaterTank/WaterTank.ino:62-67,412-422`
The event ring buffer (`eventBuf[64]`) is in **volatile DRAM**. On any power loss or brownout, all un-synced events are lost. This is a motor controller — power cycling is normal (MCBs trip, electricity goes out). An ESP32 has RTC RAM (~8KB slow memory that survives deep sleep and soft resets) and a flash filesystem (SPIFFS/LittleFS). Neither is used for event persistence. The board's event log is the phone's only source of truth for "what happened while I was away" — and it's lost on every power cycle.

### 1.4 [HIGH] OTA `delay(2000)` in BLE callback context blocks the stack
**File:** `firmware/WaterTank/WaterTank.ino:366`
```cpp
void onComplete(NimBLEOta*) override {
  Serial.println("BLE-OTA: complete — rebooting in 2s"); delay(2000); esp_restart();
}
```
`onComplete` is called from NimBLE's internal task context. Blocking 2 seconds here stalls the BLE stack — any in-flight notifications or disconnect handling is frozen. Should set a flag and let `loop()` handle the restart on the next tick.

### 1.5 [HIGH] `pushState()` validates firmware on first successful notify — too early
**File:** `firmware/WaterTank/WaterTank.ino:507-511`
`esp_ota_mark_app_valid_cancel_rollback()` is called the first time `pushState()` runs after boot. This marks the new firmware as valid **before the app has confirmed the version**, which defeats the rollback window. The app's confirm step (firmware-update.tsx:67-89) reads the version asynchronously ~1.5s after reconnect. If the first notify fires first (it fires 800ms post-connect), the new firmware is locked in before the app has a chance to detect a bad flash. The validation should be gated on a flag set by the app explicitly acknowledging the version.

### 1.6 [MEDIUM] Initial state push timing is unreliable
**File:** `firmware/WaterTank/WaterTank.ino:82,296`
`pushScheduled = millis() + 800` fires 800ms after BLE connect. But the app's full connect sequence (discover services + request MTU + read 3 characteristics + write time-sync + subscribe to 2 notifies) can take 1.5-3s depending on BLE stack latency. The first push may fire before CCCD subscriptions are registered on the phone side, resulting in a dropped initial state. The first data the user sees after connect is random timing-dependent.

### 1.7 [MEDIUM] Simulation `tickAutomation` mutates `tankPct` inside `getTankLevel()`
**File:** `firmware/WaterTank/WaterTank.ino:400-408`
`getTankLevel()` has the side effect of mutating the global `tankPct` by `±FILL_STEP_PCT/DRAIN_STEP_PCT` every call. This is called from `tickAutomation()` which then uses `tankPct` in multiple conditions. The side-effect-in-getter pattern makes the state machine harder to reason about and is fragile when refactoring. `getTankLevel()` should be a pure reader; mutation should happen in `tickAutomation()`.

### 1.8 [MEDIUM] `checkWifi()` blocks loop() for up to 8 seconds
**File:** `firmware/WaterTank/WaterTank.ino:516-532`
On WiFi disconnect, `checkWifi()` calls `WiFi.begin()` with a blocking `while(...delay(200))` up to 8 seconds. During this time, `loop()` is blocked — the stall watchdog (12s timeout) could fire, `loopLogStream()` stalls, and the BLE notify cadence is disrupted. For BLE-only production builds this is removed by `USE_WIFI`, but until then it affects debug builds.

### 1.9 [LOW] `NOTIFY_INTERVAL_MS` in firmware (2000ms) vs `BLE_NOTIFY_INTERVAL` in thresholds.ts (5000ms) — inconsistent
**File:** `firmware/WaterTank/WaterTank.ino:45` vs `constants/thresholds.ts:7`
The app declares 5000ms but the firmware pushes every 2000ms. The app doesn't use `BLE_NOTIFY_INTERVAL` anywhere, so this is harmless but misleading. Should be deleted or aligned.

---

## Section 2: App — Production Reliability

### 2.1 [CRITICAL] No integration test on real hardware
The BLE protocol test suite (`scripts/ble_test.py`, 41 tests) and auth test suite (`scripts/auth_test.py`, 24 tests) are Python scripts that run against a test board on the bench. There is **no automated app-level integration test** covering:
- App cold-start → BLE connect → auth → state subscription → dashboard renders
- Simulation → DB writes → records screen
- OTA flow: download → transfer → reboot → confirm
- Settings persistence across app restart
- Notification delivery on real device

The OTA bench test (`scripts/ota_bench_test.py`) has 24/26 green — 2 are expected failures but the test is a Python script, not an app integration test.

### 2.2 [HIGH] BLE scan can silently fail on Android 12+ without runtime permissions
**File:** `app/_layout.tsx:84-86`, `services/BLEService.ts:306-379`
The app requests notification permissions on mount but never explicitly requests `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` via `PermissionsAndroid`. On Android 12+, BLE scanning will throw or silently return no results until the user grants these through the OS prompt. The scan error handler calls `scheduleReconnect()` which retries — producing an infinite silent-retry loop that looks like "Looking for device…" forever. This was auditp1 A11 (marked HIGH, marked resolved) but the fix was only partial — `PermissionsAndroid.request()` is still not called before first scan.

### 2.3 [HIGH] `checkFirmwareUpdate` runs on every BLE reconnect — GitHub rate limit risk
**File:** `context/DeviceContext.tsx:108-119`
The effect fires on every change of `deviceState.firmwareVersion`, which is re-read on every BLE connect. BLE reconnects frequently in the field (every 5/10/20/30s backoff cycle on disconnect). Each fire makes 2 unauthenticated GitHub API calls. GitHub's unauthenticated limit is 60 req/hr/IP. A flapping connection exhausts it, after which the firmware update badge silently never appears.

### 2.4 [HIGH] `exportData()` returns all events with no size limit
**File:** `context/DeviceContext.tsx:370`
```ts
const exportData = useCallback(() => getAllEvents(), []);
```
`getAllEvents()` does `SELECT * FROM events ORDER BY epoch ASC` with no LIMIT. After months of pump cycles (4-8 events/day), this is thousands of rows. `Share.share()` with a large string can timeout or crash on Android. CSV export in settings.tsx already handles truncation, but the raw `exportData` used by ReportProblemSheet does not.

### 2.5 [MEDIUM] Motor ON/OFF badge labels are hardcoded English
**File:** `app/(tabs)/index.tsx:353,368,416`
The motor and inlet status badges show "ON"/"OFF" as hardcoded strings. These are visible in the dashboard for Hindi/Marathi/Kannada users. Simple fix — use t("on") / t("off").

### 2.6 [MEDIUM] `triggerSync` has no guard against overlapping log streams
**File:** `services/BLEService.ts:155-157`
```ts
triggerSync(): void {
  if (this.device && this.running) this.requestLogStream().catch(() => {});
}
```
Tapping the sync button while an auto-sync-on-connect log stream is running starts a second `LOG_DATA` monitor and writes a second `LOG_START`. Two concurrent monitors push into separate `pendingEvents` arrays, and both will ACK — causing double-inserts and potential data loss if the board clears events on the first ACK.

---

## Section 3: Security

### 3.1 [CRITICAL] Wi-Fi credentials in source control (see 1.2)
Same finding, repeated here for security emphasis. The password `"Passw01d"` for SSID `"Neo6G"` is in git history permanently. Even if removed from HEAD, it's recoverable from any prior commit. The repo should be treated as compromised — rotate the password immediately and consider `git filter-branch` or repo recreation.

### 3.2 [HIGH] Auth uses SHA256(password) with no salt
**File:** `firmware/WaterTank/WaterTank.ino:118-126,197-199`
The password hash is `SHA256(password)` with no per-device salt. Two boards with the same password produce the same hash. The hash is stored in NVS (`prefs.putBytes("pw_hash", …)`) which is readable by anyone with physical access to the ESP32. Session tokens use `esp_random()` (TRNG-backed, good), but the underlying password hash has no brute-force protection.

### 3.3 [HIGH] No firmware signing — manifest SHA256 verified app-side but board trusts any validly-framed OTA
**File:** `firmware/WaterTank/WaterTank.ino:643`; `services/FirmwareUpdateService.ts:93-101`
The app verifies `SHA256(firmwareBytes) == manifest.sha256` before transfer (good — auditp3 finding resolved). But the board's NimBLEOta accepts any firmware that passes CRC16 per sector. CRC16 is not cryptographic. A malicious actor with a custom app (or a modified APK) can flash arbitrary firmware to any board in BLE range, provided they can authenticate. Since `esp_random()` tokens are good and auth gates the OTA service, the practical attack requires either (a) knowing the password or (b) having a valid session token. Mitigation: require signed firmware on the board side (NimBLEOta supports signature verification callbacks).

### 3.4 [MEDIUM] Session tokens stored in plaintext in AsyncStorage
**File:** `services/AuthService.ts:20-31`
Session tokens are stored as hex-encoded strings in AsyncStorage under `@watertank_auth`. On Android, AsyncStorage is unencrypted by default. A device compromise reveals all paired board tokens. For a motor controller this is lower risk, but worth documenting.

### 3.5 [LOW] `SUPPORT_WHATSAPP_NUMBER` is a placeholder
**File:** `constants/support.ts:3`
```ts
export const SUPPORT_WHATSAPP_NUMBER = "91XXXXXXXXXX";
```
The "Report a Problem" button opens a broken WhatsApp link. Must be set before any field deployment.

---

## Section 4: Codebase Health

### 4.1 [MEDIUM] Dead components in source tree
The following files are not imported anywhere in the app:
- `components/StatusDot.tsx` — dashboard uses inline status pill via StatusIndicators
- `components/TankLevelBar.tsx` — dashboard uses WaterTankWidget
- `components/KeyboardAwareScrollViewCompat.tsx` — no imports found
- `utils/formatters.ts:getTankColor()` — only used by the dead TankLevelBar

These add to Metro's module graph and create maintenance surface area. Remove them.

### 4.2 [MEDIUM] Unused constants
**File:** `constants/thresholds.ts:1,3,4,6,7`
- `TANK_FULL_PCT` — unreferenced in app code (firmware uses its own `FULL_TANK_PCT_DEFAULT`)
- `TANK_WARN_BLINK_PCT` — unreferenced
- `FLOW_ZERO_TIMEOUT_MS` — unreferenced
- `SENSOR_POLL_MS` — unreferenced
- `BLE_NOTIFY_INTERVAL` (5000) — unused, and inconsistent with firmware's 2000ms

**File:** `constants/ble.ts:1` — `BLE_DEVICE_NAME` is imported but device matching uses `isTankDevice()` which checks `name.includes("watertank")`. The constant is effectively dead.

**File:** `models/Event.ts:67-74` — `PUMP_STATE_LABELS` is exported but never imported.

### 4.3 [MEDIUM] `IDeviceService` interface is incomplete
**File:** `services/IDeviceService.ts`
`getConnectedDeviceId()`, `triggerSync()`, `writeFillTarget()`, `submitPassword()`, `submitSetup()`, `setVisibility()` are all concrete methods on `BLEService` but not declared on the interface. Callers cast to `BLEService` directly via `as BLEService | null`, bypassing the interface entirely. Either complete the interface or remove it — the half-interface is worse than no interface.

### 4.4 [MEDIUM] Multiple ID generation schemes coexist
Three different ID generation strategies in the codebase:
1. `BLEService.nextId()` — `Date.now()` seeded, monotonic increment
2. `SimulationService.nextId()` — separate `Date.now()` seed, independent counter
3. Firmware `nextEventId` — starts at 1, monotonic increment

The DB has `UNIQUE INDEX idx_events_id ON events(id)` and uses `INSERT OR IGNORE`. Collision scenarios:
- Firmware event id=1 collides with a prior `Date.now()`-seeded app ID from a previous app session → real event silently dropped
- Simulation IDs collide with BLE IDs from same-millisecond window → one event lost

Fix: namespace IDs by source. Board events should use `(board_mac, board_event_id)` composite. App-generated events should use a different prefix.

### 4.5 [LOW] ~33 APK files in repo root
```
watertank-v17-release.apk, v18, v26, v27, v27, v28, v29, v32
```
These are binary blobs (each ~20-40MB) in the git root. Total ~300+ MB. They bloat `git clone` for every collaborator and CI system. Move to GitHub Releases (already used for firmware) or add to `.gitignore`.

### 4.6 [LOW] No TypeScript strict mode
**File:** `tsconfig.json`
The project doesn't use `"strict": true`. Given the BLE code's reliance on type casts and optional chaining through `any`-typed BleManager interfaces, strict mode would catch real bugs. The `any` casts in BLEService.ts (lines 247-251, 285-288, 309-312, etc.) are necessary because the BleManager type is dynamic, but centralizing those casts into a typed wrapper would allow the rest of the codebase to go strict.

### 4.7 [LOW] Two package managers (npm + pnpm)
**File:** `package-lock.json` (370KB) + `pnpm-lock.yaml` (332KB)
Both lockfiles exist. The project uses `pnpm` per `pnpm-workspace.yaml` and the `pnpm` dependency in package.json, but `package-lock.json` is still present. Delete one.

---

## Section 5: UX for Target Users (Non-Technical, Multi-Lingual, Low-Connectivity)

### 5.1 [HIGH] Critical error screens are entirely in English
**Files:** `components/ErrorFallback.tsx`, `app/firmware-update.tsx` (partially fixed), settings.tsx diagnostics section
When the app crashes (ErrorBoundary), the user sees "Something went wrong", "Please reload the app to continue.", "Try Again", "Error Details" — all English. A Marathi-only village user faced with a crash has no idea what to do. The ErrorFallback must be fully localized.

### 5.2 [HIGH] No offline data access strategy
The app requires BLE connection to see current tank level. There is no polling or scheduled background sync. If the user opens the app while away from the tank, they see "Looking for device…" and the "Try Demo" button. The last-known tank (persisted since L1 fix) helps but:
- Only shows tank level, not motor state
- No way to see "motor ran for 45 min this morning" without connecting
- Records screen shows synced history but there's no indication of what data is local vs. needs sync

### 5.3 [MEDIUM] No tank-level trend or alert threshold configuration
The app shows current tank% and motor status. It doesn't show:
- "Your tank fills in ~45 min on average"
- "Municipal supply typically arrives between 5-7 AM"
- Configurable low-tank alert threshold (hardcoded to `TANK_LOW_PCT = 15%`)

For a village user, the most valuable insight is "will my tank fill today?" — the app has the data to answer this (event log with timestamps) but doesn't surface it.

### 5.4 [MEDIUM] No multi-device support in UI
The auth service (`AuthService.ts`) stores multiple paired devices (MAC → token map). But the UI flow is single-device. If a user has two WaterTanks (e.g., overhead tank + sump), there's no way to switch between them in the app. The BLE service `tryDirectConnect` iterates sessions but stops at the first successful connection. Multi-device needs explicit UX design.

### 5.5 [MEDIUM] Simulation/demo is the primary call-to-action when disconnected
**File:** `app/(tabs)/index.tsx:290-296`
When not connected, the main CTA is "Try Demo". For a real user who just walked up to their tank, this is confusing — they want their tank, not a demo. The primary CTA should be troubleshooting guidance, with demo as a secondary option.

---

## Section 6: Operations & Debuggability

### 6.1 [HIGH] No remote health monitoring
There is no way to know if a deployed unit is working correctly without physical access or the user actively reporting. Missing:
- Board uptime / last reboot reason tracking (reset reason is read but not trended)
- Motor cycle count and total runtime (in DB but not surfaced as a health metric)
- BLE connection reliability stats (disconnect frequency, RSSI trends)
- Firmware version fleet distribution

For a product deployed to 50+ homes, you need a dashboard showing which units are healthy and which haven't checked in.

### 6.2 [MEDIUM] Diagnostic log is phone-side only, requires user action to retrieve
**File:** `services/CrashReportService.ts`
The diagnostic ring buffer captures BLE/OTA/app errors but retrieval requires: user navigates Settings → Diagnostics → Export → Share. A user experiencing "motor didn't start" has to perform 4 steps in a foreign language to send you useful data. The Report a Problem flow auto-attaches logs, but only if the user initiates it.

### 6.3 [MEDIUM] No firmware version fleet tracking
There's no mechanism to know which firmware version is running on which board. The app reads `C_FWVER` on connect but doesn't persist it anywhere except `deviceState.firmwareVersion` (in-memory). If a bad firmware is deployed via OTA, you have no way to audit which boards got it.

### 6.4 [LOW] No analytics or usage telemetry
No crash reporting (e.g., Sentry), no usage analytics. For a field-deployed product, you need at minimum: crash rate, active installs, firmware version distribution. This should be opt-in and privacy-preserving.

---

## Section 7: Test Coverage

### 7.1 [BLOCKER] No automated app tests
There are zero Jest/React Native Testing Library tests in the project. The `package.json` has no test script. All testing is manual or via Python scripts against a bench board.

### 7.2 [MEDIUM] BLE OTA bench test marks 2 tests as "expected failures"
**File:** `kb/status.md:89`
> T_BLE3 (char not in v1.1.0) and OTA#2 same-version rejection are expected failures.

Two failing tests in the only automated test suite for the most dangerous operation (OTA) is not acceptable for production. These should be fixed or the test suite should be updated.

### 7.3 [MEDIUM] No firmware unit tests
The firmware has no test framework. The automation state machine (`tickAutomation()`) has 7 states and numerous transitions — all untested except by running the simulation. A bug in the state machine (e.g., motor doesn't stop on supply cut) could burn a pump or flood a tank.

---

## Section 8: Remaining Audit Findings (Cross-Reference)

The 44 auditp1 findings are all resolved per `kb/status.md`. However, several auditp3 findings that were described as fixed still have residual issues or were only partially addressed:

### 8.1 [HIGH] BLE OTA packet size overflow — resolved but unverified on hardware
**File:** `services/FirmwareUpdateService.ts:116`
`MAX_DATA_PER_PACKET = 504` correctly accounts for MTU-3-2 = 507 with room for the 2-byte CRC on last packets. But this was fixed in code only — the OTA bench test has not been re-run to verify on-device. The status.md still says "24/26 green" from the pre-fix test run.

### 8.2 [MEDIUM] `requestLogStream` timeout still ACKs on timeout
**File:** `services/BLEService.ts:559-569`
The timeout handler sends `BLE_LOG_ACK` with a comment "sending ACK anyway". This tells the board it can clear events, but the transfer was incomplete. If the board implements event clearing on ACK (currently it doesn't — `LogCtrlCB:331` just logs "ACK"), this would cause data loss. The ACK-on-timeout should be removed and replaced with a "partial sync" approach.

### 8.3 [MEDIUM] BlePairingSheet orphaned connection still present
**File:** `components/BlePairingSheet.tsx:85-96`; `kb/status.md:79`
Acknowledged as F5 ("low priority — only affects onboarding re-pair edge case"). But for a product, the onboarding flow must work reliably. If a user's first experience is a failed connection on the pairing screen, they're unlikely to try again.

---

## Section 9: Architecture — Structural Recommendations

### 9.1 Extract BLE manager to a typed wrapper
The current pattern of `getBleManager() as { … typed methods … }` is repeated in 4+ places (BLEService, FirmwareUpdateService, BlePairingSheet). This creates divergence risk — each cast site defines its own subset of the BleManager type. Extract to a single `BleManagerWrapper` class with the complete typed interface.

### 9.2 Introduce a proper state machine for device connection
The BLE lifecycle (scanning → connecting → discovering → auth → setup → live → disconnected → reconnecting) is managed via `running` boolean + `reconnectAttempt` counter + scattered timeouts. This is error-prone. A proper state machine (even a simple string enum with transition table) would make the reconnection logic testable and auditable.

### 9.3 Separate motor control logic from BLE transport
Currently `tickAutomation()` in firmware directly calls `pushState()` which calls `charState->notify()`. The automation logic should be independent of the BLE transport — it should update state, and a separate "notify layer" should push changes to BLE. This makes the motor control testable without BLE and allows future transports (WiFi MQTT, LoRa).

### 9.4 Database schema versioning
The DB schema (`CREATE TABLE IF NOT EXISTS`) has no version field. If a future migration adds a column, there's no mechanism to detect and apply it. Add a `schema_version` table or `PRAGMA user_version`.

---

## Prioritized Action Plan

### Before deploying to 1 real user (MVP gate):
1. **Rotate Wi-Fi password** — committed credentials are permanently in git history
2. **Implement `USE_SENSOR=1` path** — write the JSN-SR04T driver + test tickAutomation with real I/O
3. **Gate Wi-Fi behind `#define USE_WIFI`** — production firmware must be BLE-only, no credentials
4. **Add BLE runtime permissions request** — Android 12+ won't scan without it
5. **Localize ErrorFallback** — crash screen must be in user's language
6. **Set `SUPPORT_WHATSAPP_NUMBER`** — broken link ships otherwise

### Before deploying to 10 users (field trial gate):
7. **Persist event log to RTC RAM or flash** — power-loss safety
8. **Run OTA bench test on current code** — verify packet size fix on hardware
9. **Add firmware signing verification** — prevent rogue firmware flashing
10. **Fix OTA confirm timing** — gate fw validation on app ACK, not first notify
11. **Add `triggerSync` guard** — prevent overlapping log streams
12. **Remove dead code** — StatusDot, TankLevelBar, KeyboardAwareScrollViewCompat, unused constants
13. **Fix ID collision** — namespace event IDs by source (board vs app vs simulation)
14. **Add DB schema versioning** — future-proof for migrations

### Before scaling to 50+ units:
15. **Remote health dashboard** — firmware version, uptime, motor cycles per board
16. **Multi-device UI** — users with 2+ tanks
17. **Automated app test suite** — Jest + React Native Testing Library
18. **CI/CD pipeline** — build APK on push, run tests, create GitHub Release
19. **Crash reporting** — Sentry or equivalent for production crash monitoring
20. **Usage analytics** — opt-in, privacy-preserving

---

## Summary Table

| # | Severity | Area | Description |
|---|---|---|---|
| 1.1 | BLOCKER | Firmware | Sensor integration not implemented (USE_SENSOR=0 only) |
| 1.2 | BLOCKER | Security | Wi-Fi credentials in source control |
| 1.3 | BLOCKER | Firmware | Event log in volatile DRAM — lost on power cycle |
| 7.1 | BLOCKER | Testing | Zero automated app tests |
| 1.4 | HIGH | Firmware | OTA onComplete blocks BLE stack with delay(2000) |
| 1.5 | HIGH | Firmware | pushState locks firmware before app confirms version |
| 2.2 | HIGH | App | BLE permissions not requested before scan (Android 12+) |
| 2.3 | HIGH | App | GitHub rate limit on firmware check — flaps on reconnect |
| 2.4 | HIGH | App | exportData unbounded — can crash Share on large DB |
| 3.2 | HIGH | Security | SHA256(password) with no salt |
| 3.3 | HIGH | Security | No firmware signing verification on board side |
| 5.1 | HIGH | UX | ErrorFallback entirely in English |
| 5.2 | HIGH | UX | No offline data access strategy |
| 6.1 | HIGH | Ops | No remote health monitoring |
| 8.1 | HIGH | OTA | Packet size fix unverified on hardware |
| 1.6 | MEDIUM | Firmware | Initial push timing unreliable vs app connect sequence |
| 1.7 | MEDIUM | Firmware | getTankLevel mutates global state (side-effect-in-getter) |
| 1.8 | MEDIUM | Firmware | checkWifi blocks loop for up to 8s |
| 2.5 | MEDIUM | App | Motor ON/OFF badge hardcoded English |
| 2.6 | MEDIUM | App | triggerSync has no guard against overlapping streams |
| 3.4 | MEDIUM | Security | Session tokens in plaintext AsyncStorage |
| 4.1 | MEDIUM | Code | Dead components (StatusDot, TankLevelBar, KeyboardAwareScrollViewCompat) |
| 4.2 | MEDIUM | Code | Unused constants in thresholds.ts and ble.ts |
| 4.3 | MEDIUM | Code | IDeviceService interface incomplete |
| 4.4 | MEDIUM | Code | Multiple ID generation schemes — collision risk |
| 5.3 | MEDIUM | UX | No trend / alert threshold configuration |
| 5.4 | MEDIUM | UX | No multi-device support in UI |
| 5.5 | MEDIUM | UX | Demo is primary CTA when disconnected |
| 6.2 | MEDIUM | Ops | Diagnostic log retrieval requires user action |
| 6.3 | MEDIUM | Ops | No firmware version fleet tracking |
| 7.2 | MEDIUM | Testing | OTA bench test has 2 expected failures |
| 7.3 | MEDIUM | Testing | No firmware unit tests |
| 8.2 | MEDIUM | App | Log stream timeout ACKs and drops data |
| 8.3 | MEDIUM | App | BlePairingSheet orphaned connection |
| 1.9 | LOW | Firmware | NOTIFY_INTERVAL mismatch (2000 vs 5000) |
| 3.5 | LOW | Security | WhatsApp number placeholder |
| 4.5 | LOW | Code | ~33 APK files in repo root |
| 4.6 | LOW | Code | No TypeScript strict mode |
| 4.7 | LOW | Code | Two lockfiles (npm + pnpm) |
| 6.4 | LOW | Ops | No analytics or crash reporting |

_Total: 44 findings (4 BLOCKER, 9 HIGH, 20 MEDIUM, 7 LOW)_

---

## Appendix: What's Good

To be clear about what's working well — this isn't a tear-down:

- **BLE auth system (Phase 1-3)** — Tapo-style password + session token auth with setup flow is well-designed and implemented. 24/24 auth tests green.
- **OTA firmware update (Phase 1-6)** — Full NimBLEOta protocol implementation with progress tracking, cancellation, rollback, and SHA-256 verification. The most complex feature in the app and it works.
- **i18n coverage** — 4 languages (en/hi/mr/kn) with 100+ translated keys. The infrastructure is solid; the gaps are in hardcoded strings, not missing architecture.
- **CrashReportService** — Ring buffer diagnostic log with structured entries (level/tag/context), BLE/OTA/board/app tags, and WhatsApp export. The foundation is correct.
- **WaterTankWidget** — PNG overlay + SVG water animation with dual tank color support, per-color clip rects, and AppState-aware animation lifecycle. The most polished visual element.
- **Audit discipline** — 44 auditp1 findings → all resolved. 32 auditp3 findings → most resolved. This project takes code review seriously. The gap is now in hardware integration and operational readiness, not code quality diligence.
- **Commit protocol** — consistent small commits with descriptive messages, kb/session_logs.md append, and kb/status.md updates. Good engineering hygiene.

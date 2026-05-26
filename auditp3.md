# WaterTank — Audit P3
_Date: 2026-05-26 | Auditor: Claude Opus | Branch: bleOTA_

## Summary
The codebase is mature and most of the 44 auditp1 findings are genuinely fixed (clamping, pumpState reset, persisted last-known, lowercase UUIDs, AsyncStorage in dependencies, settings versioning). The largest area of new risk is the **BLE OTA path on the `bleOTA` branch** — the app-side NimBLEOta packet encoder has a packet-size overflow against the 512 MTU, the firmware-vs-app version contract is loosely validated (`min_app_version` ignored, semver parsing brittle), and several OTA error/abort paths leak BLE subscriptions or never reconnect. There is also a **hooks-after-early-return bug in `EventRow`** that can crash the Records screen, a notification permission race that silently drops field alerts, and the crash-report service is not wired to the React error boundary (so the very crashes a field tech needs are not logged). i18n coverage across en/hi/mr/kn is excellent for declared keys, but the entire firmware-update flow, diagnostics section, and several dashboard/settings strings are hardcoded English — invisible to a Marathi-only village user.

## Severity Legend
- **CRITICAL** — data loss, crash, security hole, silent failure in field
- **HIGH** — wrong behavior visible to user, BLE/OTA failure path
- **MEDIUM** — degraded UX, missed log, performance issue, code smell
- **LOW** — cosmetic, minor, future-risk

## Findings

### [Bug] EventRow calls hooks after a conditional early return [CRITICAL]
**File:** components/EventRow.tsx:54-58
**Issue:** `EventRow` does `if (HIDDEN_EVENT_TYPES.includes(event.type)) return null;` on line 55, and only *after* that calls `useColors()`, `useLanguage()`, `useAppFont()` (lines 56-58). This violates the Rules of Hooks: when a row transitions between a hidden type (BLE_SYNCED) and a visible type, the number of hooks called changes between renders. React throws "Rendered fewer hooks than expected" and the entire Records `FlatList` can crash to the ErrorBoundary. Today it usually survives because BLE_SYNCED rows are filtered before reaching the list in most paths, but `getEventsForDay` returns *all* types and the FlatList renders them directly, so a synced event in the day's data will hit this.
**Fix:** Move all hook calls to the top of the component, compute `borderColor`/labels, then do the early `return null` after the hooks (or filter `HIDDEN_EVENT_TYPES` in the data source / `renderItem` before `EventRow` is mounted).

### [BLE/OTA] OTA sector packet can exceed negotiated ATT payload (MTU-3) [CRITICAL]
**File:** services/FirmwareUpdateService.ts:84,128-164
**Issue:** `MAX_DATA_PER_PACKET = 509` ("512 MTU - 3 header bytes"). For a non-last packet the wire frame is `3 header + dataLen` = `3 + 509 = 512` bytes. The usable ATT write payload for WRITE_NR is `MTU - 3 = 509` bytes, not 512. A 512-byte GATT write with a 509-byte ATT MTU payload is truncated or rejected by the controller, corrupting the sector and (best case) triggering a CRC mismatch / sector reject, (worst case) a silently bad flash region. The last-packet frame is `3 + dataLen + 2(CRC)`, which is even larger. `MAX_DATA_PER_PACKET` must account for the full header+CRC overhead, not just 3 bytes.
**Fix:** Set `MAX_DATA_PER_PACKET = MTU - 3 - 2` (leave room for the 2 trailing CRC bytes that the last packet appends), i.e. ≤ 507, and verify against what `NimBLEOta.cpp` actually expects for chunk size. Add an assertion that every built packet's byte length ≤ negotiated MTU - 3 before writing.

### [BLE/OTA] `min_app_version` from manifest is never enforced [HIGH]
**File:** services/FirmwareUpdateService.ts:13-20,36-61
**Issue:** `FirmwareManifest.min_app_version` is declared and parsed but never compared against the running app version. A firmware whose protocol requires a newer app (e.g. changed OTA framing) will be offered to and flashed by an old app, then the board can be bricked or unreachable until someone drives 400km to Bangalore-and-back. This is exactly the failure class OTA is supposed to prevent.
**Fix:** After parsing the manifest, read `Constants.expoConfig?.version` and `if (semverGt(manifest.min_app_version, appVersion)) return null;` (or surface a "update the app first" message instead of offering the firmware).

### [BLE/OTA] `semverGt` mis-parses suffixed/non-numeric versions [HIGH]
**File:** services/FirmwareUpdateService.ts:24-32
**Issue:** `a.split(".").map(Number)` turns `"1.1.0-rc1"` into `[1,1,NaN]`, and any `NaN` comparison (`NaN > x`) is `false`, so a pre-release or build-tagged firmware silently reports "no update" or compares incorrectly. The board reports `FW_VERSION "1.1.0"` (firmware/WaterTank/WaterTank.ino:28) as a plain string read over `C_FWVER`; if a future build ever ships `"1.1.0b"` or a leading `v`, the check breaks. There is no guard for `version` being `undefined`.
**Fix:** Strip a leading `v`, split on `.` and `-`, coerce with a numeric guard, and treat unparseable segments as 0 while logging a warning. Validate `manifest.version` is a 3-part numeric string before trusting it.

### [BLE/OTA] OTA `waitForIndicate` leaks subscriptions on the abort/throw path [HIGH]
**File:** services/FirmwareUpdateService.ts:182-254
**Issue:** Each sector subscribes via `waitForIndicate(BLE_OTA_CHAR_RECV_FW, ...)` *before* the packet-send loop. If `signal?.aborted` becomes true inside the packet loop (lines 237-244) the function throws "Aborted" and the already-registered `monitorCharacteristicForDevice` subscription for that sector's ACK is never removed (only the timeout/callback paths call `sub.remove()`). Repeated cancel/retry cycles accumulate live indicate subscriptions on the OTA characteristic, which can wedge the GATT queue and make subsequent OTA attempts fail until the device is power-cycled — in the field, that means a tech on site.
**Fix:** Track the active `sub` and `clearTimeout(timer)/sub.remove()` in a `finally`, or wrap each sector in try/finally that tears down the pending indicate before re-checking the abort signal. Also clear the COMMAND indicate (line 210) if the start write throws.

### [BLE/OTA] Cancelling an OTA mid-transfer leaves the board half-flashed with no recovery UX [HIGH]
**File:** app/firmware-update.tsx:95-98; services/FirmwareUpdateService.ts:226-254
**Issue:** `cancel()` aborts the JS loop and sets state back to `idle`, but the board's NimBLEOta session is left mid-stream. The firmware relies on `bleOta.startAbortTimer(300)` (5 min, firmware/.../WaterTank.ino:342) to recover, during which the OTA characteristics may be busy and normal reconnect/notify is degraded. The app shows no "you cancelled mid-update, the device will recover in a few minutes" message, and immediately offers "Install" again, which can collide with the still-aborting session.
**Fix:** On cancel, send an explicit OTA-abort COMMAND if the protocol supports it, disable the Install button for ~the abort-timer window, and show a localized "Update cancelled — wait for the device to reset" message.

### [BLE/OTA] OTA confirm step trusts firmware version read with no timeout/retry [HIGH]
**File:** app/firmware-update.tsx:41-57
**Issue:** After reboot the screen waits for `deviceState.connected` then, after a single fixed 1500ms timer, compares `deviceState.firmwareVersion === targetVersion`. The new firmware's version characteristic is read by `BLEService` asynchronously on connect; if that read lands a few hundred ms after the 1500ms timer, the screen declares "Board reconnected but reports v? instead of expected vX" and shows **failure for a successful update**. Conversely, if the board never reconnects (failed flash), the screen sits in "rebooting…" forever with no timeout.
**Fix:** Poll `deviceState.firmwareVersion` for up to ~30s after reconnect before declaring mismatch; add an overall "rebooting" timeout (e.g. 60s) that surfaces a "device did not come back — it has rolled back" error.

### [Bug] Notification permission race silently drops field alerts on cold start [HIGH]
**File:** services/NotificationService.ts:9-51; app/_layout.tsx:97-100
**Issue:** `notify()` returns immediately if `permissionGranted` is false (line 42). `permissionGranted` is a module-level boolean that starts `false` and is only set true *after* the async `requestPermissions()` resolves. On every cold start there is a window where pump-state transitions (motor on/off, manual override, tank low) fire before permission state is resolved, and those notifications are silently dropped — even for a user who granted permission long ago. For a village user who relies on the "motor started" alert, the first event after opening the app may never notify.
**Fix:** In `notify()`, if `!permissionGranted`, `await requestPermissions()` (which re-checks the OS state) before bailing, or have `requestPermissions()` run to completion before `DeviceProvider` starts emitting state. Consider persisting the last-known grant so the gate isn't re-armed every launch.

### [Crash Service] React render crashes are never logged [HIGH]
**File:** components/ErrorBoundary.tsx:32-36; app/_layout.tsx:104; services/CrashReportService.ts
**Issue:** `ErrorBoundary` accepts an `onError` prop and calls it in `componentDidCatch`, but `_layout.tsx` mounts `<ErrorBoundary>` with no `onError`. So component-render crashes (the ones that show the "Something went wrong" screen the user actually sees) are **not** written to the diagnostic ring buffer. The global `ErrorUtils` handler in `CrashReportService.init()` catches uncaught JS exceptions but React swallows render errors into the boundary before they reach `ErrorUtils`. Net result: the exact crash a remote tech is debugging via "Report a Problem → diagnostic log" is missing from the log.
**Fix:** Pass `onError={(error, stack) => append/logAppError(...)}` to `ErrorBoundary` and add a `logAppError(msg, ctx)` export to `CrashReportService`. Flush synchronously like the global handler does.

### [Crash Service] No coverage for OTA download failures, notification failures, or DB init failure [MEDIUM]
**File:** services/FirmwareUpdateService.ts:65-76; services/NotificationService.ts:35-50; context/DeviceContext.tsx:116-122
**Issue:** `downloadFirmware` throws on non-200 but nothing logs the HTTP status to the diag buffer (only `logOtaEvent`/`logOtaError` exist and are called for transfer, not download). `NotificationService` failures `console.warn` only — invisible in a release build with no console. `initializeDatabase()` failure shows an `Alert` but is not appended to the diag log, so "user has no history" reports lack the root cause.
**Fix:** Add `logOtaError("download failed", {status})`, route notification errors through `CrashReportService`, and `append("error","app","db init failed",...)` on the DB catch.

### [Bug] `checkFirmwareUpdate` runs on every connect, GitHub-rate-limited, unauthenticated [MEDIUM]
**File:** context/DeviceContext.tsx:100-112; services/FirmwareUpdateService.ts:39-41
**Issue:** The effect fires on every change of `deviceState.firmwareVersion`, which is re-read on every reconnect (and BLE reconnects frequently in the field per the 5/10/20/30s backoff). Each fire makes 2 unauthenticated GitHub API calls. GitHub's unauthenticated limit is 60 req/hr/IP; a flapping connection can exhaust it, after which `releaseRes.ok` is false and updates silently never appear. There is also no caching of the manifest.
**Fix:** Debounce/throttle the check (e.g. once per app session or once per N hours), cache the last manifest+timestamp, and skip if checked recently. Optionally back off on 403/429.

### [Bug] `eventIdCounter = Date.now()` collides between BLE and Simulation services [MEDIUM]
**File:** services/BLEService.ts:78-82; services/SimulationService.ts:11-12; storage/database.ts:40
**Issue:** Both services seed a module-level `eventIdCounter` from `Date.now()` and increment. The events table has `CREATE UNIQUE INDEX idx_events_id ON events(id)` and inserts use `INSERT OR IGNORE`. If a simulation run and a real BLE event are generated within the same millisecond window across the two counters (e.g. user runs demo right around a sync), IDs can collide and a real event is silently dropped by `OR IGNORE`. BLE log-stream events use the board-supplied `ev.id` (1, 2, …) which will *definitely* collide with prior `Date.now()`-seeded rows across restarts → real synced events ignored.
**Fix:** Namespace IDs by source (e.g. board events keyed by `epoch`+board id, app events by a monotonic high-bit prefix) or drop the global unique-id index and rely on `(id, epoch)` PK only. The board's `id:1/id:2` log frames are the real hazard — they must not share an ID space with `Date.now()` counters.

### [Firmware/Protocol] Firmware log stream sends only 2 hardcoded fake events; real events never persisted on-device [MEDIUM]
**File:** firmware/WaterTank/WaterTank.ino:153-199
**Issue:** `loopLogStream()` always emits the same two synthetic JSON frames (`id:1` and `id:2`) then `DONE`. There is no event ring buffer on the board, so any motor on/off that happens while the phone is disconnected is lost — the whole point of the log-sync ("records while away") is not implemented. Combined with the ID-collision finding above, after the first sync these two frames are ignored forever (same IDs), so Records will look empty/stale.
**Fix:** Implement a real on-device event log (RTC-timestamped ring buffer in RTC RAM or flash), stream actual events, and ACK to advance/clear the buffer. Until then, document clearly that history is simulated.

### [Firmware] Initial-push comment/code timing mismatch (800ms vs 400ms) [LOW]
**File:** firmware/WaterTank/WaterTank.ino:82,366
**Issue:** `onConnect` sets `pushScheduled = millis() + 800;` with comment "push 800ms post-connect", but the loop comment at line 366 says "Initial state push — 400ms after connect". Harmless but confusing; the app's connect sequence (discover + MTU + reads + time-sync) can take >800ms, so the first push may race the CCCD subscription.
**Fix:** Reconcile the comments; consider keying the first push off the first successful CCCD write rather than a fixed delay.

### [Security] Wi-Fi SSID and password hardcoded in firmware source [MEDIUM]
**File:** firmware/WaterTank/WaterTank.ino:26-27,299
**Issue:** `#define SSID "Neo6G"` / `#define PASS "Passw01d"` are committed in the repo, as is the AP fallback `"StormBoard"/"esp32ota"`. This is the developer's home/field network credential in version control and in every flashed binary. Anyone with the firmware binary or repo access has the Wi-Fi password. For production (BLE-only) builds this Wi-Fi/OTA path is dead weight and a liability.
**Fix:** Move credentials to a non-committed header / build-time secret, and gate the entire Wi-Fi+wfHandleOTA block behind the planned `#define USE_WIFI` so production units ship without embedded credentials. Rotate the exposed password.

### [Security] OTA firmware integrity (sha256) is in the manifest but never verified [HIGH]
**File:** services/FirmwareUpdateService.ts:13-19,65-76,170-258
**Issue:** `FirmwareManifest.sha256` is declared and downloaded but the downloaded `firmwareBytes` are never hashed/compared before being streamed to the board. The download is plain `fetch` over HTTPS to a GitHub asset; a corrupted/truncated download (common on flaky village connectivity) or a MITM on a compromised network would be flashed without integrity check. NimBLEOta does CRC16 per sector (catches transport corruption) but not whole-image authenticity, and CRC16 is not cryptographic.
**Fix:** Compute SHA-256 of `firmwareBytes` (e.g. `expo-crypto`) and compare to `manifest.sha256` before `performOtaTransfer`; abort with a clear error on mismatch. Consider signing the manifest.

### [Bug] `requestLogStream` timeout still ACKs and inserts partial events [MEDIUM]
**File:** services/BLEService.ts:385-400
**Issue:** On log-stream timeout the code logs "sending ACK anyway", inserts whatever partial `pendingEvents` accumulated, writes `BLE_LOG_ACK`, and records a sync. ACK normally tells the board "I got everything, you may clear/advance." Sending ACK after a *timeout* (incomplete transfer) can make the board discard un-sent events → permanent data loss for events that didn't make it in the window. `BLE_LOG_STREAM_TIMEOUT` is 30s but the board paces frames at 50ms; a stall mid-stream loses the tail silently.
**Fix:** On timeout, do **not** ACK (so the board re-sends next time); only insert events that form a contiguous prefix, and log the truncation to the diag buffer. Distinguish "DONE received" (safe to ACK) from "timed out" explicitly.

### [Bug] `triggerSync` can start a second overlapping log stream [MEDIUM]
**File:** services/BLEService.ts:143-147,370-468; app/(tabs)/index.tsx:201
**Issue:** The dashboard sync button calls `triggerSync()` → `requestLogStream()` with no guard against an in-flight stream. Tapping sync while the auto-sync-on-connect stream is still running registers a second `LOG_DATA` monitor and writes a second `LOG_START`. Two concurrent monitors push into two separate `pendingEvents` arrays and both will ACK, compounding the partial-ACK data loss above and double-inserting.
**Fix:** Guard with an `isStreaming` flag; ignore `triggerSync` if a stream is active (or cancel-and-restart cleanly).

### [Bug] BlePairingSheet establishes an orphaned connection that BLEService doesn't own [MEDIUM]
**File:** components/BlePairingSheet.tsx:85-96; services/BLEService.ts:248-368
**Issue:** (Acknowledged as F5 in status.md but still present and worth re-flagging with current code.) `connect(device)` calls `device.connect()` then `onSuccess()`. It never runs `discoverAllServicesAndCharacteristics`, MTU negotiation, time-sync, or hands the connected device to `BLEService`. After onboarding finishes, `BLEService.start()` runs its own scan and tries to connect again — but the device may already be in a connected state owned by the pairing sheet's transient handle, producing GATT_ERROR / "device already connected" on some Android stacks. The sheet's connection has no subscriptions, so no live data flows until BLEService's reconnect cycle eventually takes over.
**Fix:** Have BlePairingSheet either (a) just confirm the device exists and let BLEService do the real connect, or (b) hand the connected device object to `BLEService` via a new `adoptDevice()` method that runs the full discovery/subscribe sequence.

### [Perf] Dashboard countdown interval recreated and never cleared on unmount path [LOW]
**File:** app/(tabs)/index.tsx:90-98
**Issue:** The countdown effect stores the interval in `countdownRef.current` and the cleanup clears it, but when `isStartupDelay` goes false the else-branch clears the interval *without* nulling the ref, and a subsequent true→false→true can leave the cleanup clearing an already-cleared id (benign) or, if `isStartupDelay` flips rapidly, a brief double interval. Minor; the bigger smell is using `setInterval` for a 1Hz UI counter that doesn't pause when the screen is backgrounded.
**Fix:** Null the ref after clearing; consider deriving remaining time from a timestamp rather than a ticking counter so backgrounding doesn't drift.

### [Perf] `getStats()` (60-day aggregate query) runs synchronously on every WeekView render [MEDIUM]
**File:** app/(tabs)/records.tsx:40-54,292; context/DeviceContext.tsx:306; storage/database.ts:93-117
**Issue:** `WeekView` calls `getStats()` directly in the render body (line 41), which executes a synchronous `getAllSync` GROUP BY over up to 60 days of events on the JS thread every time the component re-renders. `getStats` is memoized on `refreshKey`, but the *call site* is in render, not a `useMemo`, so any parent re-render re-runs the query. On a large DB this jank-blocks the UI thread.
**Fix:** Wrap in `useMemo(() => getStats(), [getStats])` inside WeekView, or compute week stats in the DB with a date-bounded query instead of fetching 60 days and filtering in JS.

### [UX] Firmware-update, diagnostics, and tank-size-max strings are hardcoded English [HIGH]
**File:** app/firmware-update.tsx (all visible strings); app/(tabs)/settings.tsx:516,524,535,546-571,649-664; app/(tabs)/index.tsx:165,353
**Issue:** A Marathi-only user opening Firmware Update sees "Device firmware", "Available", "Install vX", "Downloading firmware…", "Transferring firmware…", "Keep phone within 2 metres. Do not close the app.", "Update complete", "Update failed", "Device has automatically rolled back…", "Try Again", "Done" — all English. Same for the Settings "DEVICE", "Firmware Update", "Current: vX", "DIAGNOSTICS", "Diagnostic logs", "Export logs", "Clear logs", "Max 99,999 L", and the developer "Run demo cycle" strings. These are user-facing in the field (a tech may walk a villager through an update over the phone).
**Fix:** Add i18n keys for the entire firmware-update screen and the diagnostics/device settings sections; the OTA flow is the highest-stakes screen to mistranslate, so it must be localized.

### [UX] OTA "Keep phone within 2 metres" but distance/RSSI is never checked [MEDIUM]
**File:** app/firmware-update.tsx:164-166; services/FirmwareUpdateService.ts
**Issue:** The warning tells the user to stay close, but nothing enforces or monitors link quality during the ~30-45s transfer. A village user who walks away mid-update gets a sector-reject failure with a generic message and (per the cancel finding) a possibly half-flashed board. No RSSI guard, no "move closer" feedback.
**Fix:** Sample RSSI before/during transfer; warn if weak; consider chunked retry on transient write failures instead of aborting the whole transfer on the first sector reject.

### [UX] Manual-override "low tank" notification is gated on `notifyMotorOn` [LOW]
**File:** context/DeviceContext.tsx:277-292
**Issue:** The tank-low notification fires only `if (... && settings.notifyMotorOn)`. Tank-low is conceptually a separate alert from "motor started", and there is no dedicated toggle for it. A user who turned off motor-start notifications also loses the (arguably more important) "your tank is running low and water hasn't come" alert.
**Fix:** Add a dedicated `notifyTankLow` setting, or document that tank-low is bundled with motor-on.

### [UX] `formatTime`/`formatDate` fall back to English "Time unknown"/"Unknown date" [LOW]
**File:** utils/formatters.ts:19,29,40
**Issue:** When `epoch` is invalid these return hardcoded English strings regardless of `lang`. Event rows from a board with a bad clock (before time-sync) will show "Time unknown" in English in an otherwise-Marathi list.
**Fix:** Route these through `t()` with new i18n keys.

### [Redundant] `BLE_DEVICE_NAME`, `BLE_NOTIFY_INTERVAL_MS`, `BLE_NOTIFY_INTERVAL` unused / duplicated [LOW]
**File:** constants/ble.ts:1,29; constants/thresholds.ts:7
**Issue:** `BLE_DEVICE_NAME` is imported in BLEService but device matching is done via `isTankDevice()`; the constant is effectively dead. `BLE_NOTIFY_INTERVAL_MS` (ble.ts) and `BLE_NOTIFY_INTERVAL` (thresholds.ts, value 5000 — and inconsistent with the 2000ms actual cadence) are both unused. `thresholds.ts` also defines `TANK_FULL_PCT`, `TANK_WARN_BLINK_PCT`, `FLOW_ZERO_TIMEOUT_MS`, `SENSOR_POLL_MS` that no longer appear to be referenced in app code.
**Fix:** Delete unused constants; keep one source of truth for notify cadence.

### [Redundant] `BlePairingSheet` uses `any`-typed manager refs, bypassing the typed wrapper [LOW]
**File:** components/BlePairingSheet.tsx:35,51-52,64
**Issue:** `managerRef = useRef<any>()` and `getBleManager() as any` discard all the careful typing BLEService uses, making the second-manager/orphan-connection issues harder to catch at compile time.
**Fix:** Reuse the same narrowed manager type from BLEService.

### [Bug] `PUMP_STATE_LABELS`, `EVENT_LABELS`, `STOP_REASON_LABELS` are English and used in CSV export [LOW]
**File:** models/Event.ts:45-67; app/(tabs)/settings.tsx:187-200
**Issue:** CSV export uses `EVENT_LABELS`/`STOP_REASON_LABELS` (English). That's arguably acceptable for a CSV, but `PUMP_STATE_LABELS` is exported and unused anywhere — dead. Worth confirming the CSV is intended to be English-only (a WhatsApp-sharing villager may expect their language).
**Fix:** Remove `PUMP_STATE_LABELS` if unused; decide CSV localization intentionally.

## User Perspective Notes
- **Trust during OTA is fragile.** A village user told "Update complete / Update failed" in English, with a confirm step that can false-fail a good update (see HIGH finding), will lose confidence fast. The single most important screen to localize and make robust is firmware-update.
- **Silent dropped notifications** (permission race) mean the user may not learn the motor started — the core value prop. This erodes trust silently.
- **"Report a Problem" → WhatsApp** is a good low-tech escape hatch, but `SUPPORT_WHATSAPP_NUMBER = "91XXXXXXXXXX"` (constants/support.ts:3) is a placeholder — in the current build the report button opens a broken `wa.me` link. **This must be set before any field deployment.**
- **Diagnostic log is the remote-debug lifeline** but (a) render crashes aren't in it and (b) it's only retrievable if the user can navigate Settings→Diagnostics→Export in English. Consider auto-attaching it to the WhatsApp report (already done) and ensuring the crashes that matter are captured.
- **Last-known tank** persistence (L1 fixed) is good; the dimmed 0.62-opacity tank with "Last known · 2h ago" is a nice trust signal for low connectivity.
- **Small screen:** the dashboard ScrollView now scrolls (L10 addressed), good. The firmware-update screen is a plain ScrollView and is fine.

## i18n Coverage
Declared keys are fully translated across en/hi/mr/kn (excellent). Hardcoded English strings still in UI:
- **app/firmware-update.tsx** — every visible string: "Firmware Update", "Device firmware", "Available", "Firmware is up to date.", "CHANGELOG", "Size: … KB · ~30–45 seconds over BLE", "Downloading firmware…", "Transferring firmware…", "{done}/{total} sectors", "Keep phone within 2 metres. Do not close the app.", "Device rebooting…", "Confirming update…", "The device will reconnect automatically…", "Verifying new firmware version…", "Update complete", "Device is now running firmware v…", "Update failed", "An unknown error occurred.", "Device has automatically rolled back…", "Install v…", "Cancel", "Done", "Try Again", and the mismatch error string in the effect.
- **app/(tabs)/settings.tsx** — "DEVICE", "Firmware Update", "Current: v…  → v… available / (up to date)", "UPDATE", "DIAGNOSTICS", "Diagnostic logs", "{count} entries · {kb} KB", "Export logs", "Clear logs", "Clear diagnostic logs?", "This cannot be undone.", "Cancel"/"Clear" (alert), "Max 99,999 L", "Developer mode"/"Developer options unlocked." (Alert), "Run demo cycle", "Simulates one full pump cycle for testing", "One complete pump cycle is being simulated", "BLE requires a native Android build…", "Show/Hide BLE log", "No BLE events yet", "Export truncated"/"Exporting most recent…", "Export failed", "OK".
- **app/(tabs)/index.tsx** — "WaterTank" title (brand, acceptable), "ON"/"OFF" motor badge (line 353), accessibilityLabel "Stop demo".
- **components/ErrorFallback.tsx** — "Something went wrong", "Please reload the app to continue.", "Try Again", "Error Details" (the crash screen a user sees is entirely English).
- **components/ReportProblemSheet.tsx** — Alert strings "WhatsApp not found", "Please install WhatsApp and try again.", "Error", "Could not open WhatsApp." and `"Firmware: …"` line in the message body.
- **utils/formatters.ts** — "Time unknown", "Unknown date", "Unknown", and the `"%dd ago"` fallback (line 91) plus hardcoded "Today"/"Yesterday" in `formatDayLabel` catch branch.
- **app/onboarding.tsx** — "Choose your language" header is intentionally shown in all 4 languages (good), acceptable.

## Redundant / Dead Code
- models/Event.ts:62-67 — `PUMP_STATE_LABELS` exported, no references found.
- constants/ble.ts:1 — `BLE_DEVICE_NAME` imported but matching uses `isTankDevice()`.
- constants/ble.ts:29 — `BLE_NOTIFY_INTERVAL_MS` unused.
- constants/thresholds.ts:7 — `BLE_NOTIFY_INTERVAL` (5000) unused and inconsistent with firmware 2000ms cadence.
- constants/thresholds.ts:1,3,4,6 — `TANK_FULL_PCT`, `TANK_WARN_BLINK_PCT`, `FLOW_ZERO_TIMEOUT_MS`, `SENSOR_POLL_MS` appear unreferenced in app code (verify before deleting; some may be firmware-doc mirrors).
- services/BLEService.ts:161-165 and services/SimulationService.ts:87-91 — `logEvent` private method in BLEService is only used by simulation-like paths; the BLE service's `logEvent` is defined but real events come through `requestLogStream` (`insertEvent` directly). Confirm `BLEService.logEvent` is reachable; appears dead.
- components/TankLevelBar.tsx — full component; not imported by any screen (dashboard uses WaterTankWidget). `getTankColor` in formatters exists *only* to serve TankLevelBar (status.md A9 note). If TankLevelBar is truly unused, both can go.
- components/StatusDot.tsx — not referenced by current dashboard (index.tsx uses inline status pill + StatusIndicators). Likely dead.
- components/KeyboardAwareScrollViewCompat.tsx — not imported anywhere found.
- services/IDeviceService.ts — `getConnectedDeviceId` is used by firmware-update via `getBleService()?.getConnectedDeviceId` but is **not** declared on the `IDeviceService` interface (BLEService has it as a concrete method); the optional-chaining masks the missing interface member.

## Firmware Notes
- **Hardcoded Wi-Fi credentials in source/binary** (lines 26-27, 299) — security + production-hygiene issue (see Security finding). Gate behind `#define USE_WIFI`.
- **Log stream is fake** (lines 153-199) — only two synthetic events; no real on-device event buffer. Records "while away" is not actually implemented. Combined with app-side ID collisions, synced events get `OR IGNORE`d after the first sync.
- **OTA reboot is a blocking `delay(2000)` in `onComplete`** (line 143) — runs in a BLE callback context; blocking 2s there can stall the stack. Prefer scheduling the restart from `loop()`.
- **`pushState()` calls `esp_ota_mark_app_valid_cancel_rollback()` on first successful notify** (lines 247-251) — good rollback design, but "first notify" can happen before the app has actually confirmed the new version (the app's confirm read may not have completed), so the validation window is effectively tied to BLE notify, not to app confirmation. Acceptable but worth documenting.
- **Initial-push timing**: comment says 400ms (line 366) but code uses 800ms (line 82); the full app connect sequence (discover + MTU + 2 reads + time-sync write) can exceed 800ms, risking the first push before CCCD subscribe.
- **`updateSimulation()` is driven from both the initial push and the periodic tick** — fine for a demo, but means tank% advances on a fixed schedule independent of real time; not a bug for sim, but must be removed for `USE_SENSOR` builds.
- **Stall watchdog** (lines 386-394) and `advertiseOnDisconnect(true)` are solid hardening against the NimBLE 2.x disconnect bug — no issue, good work.
- **Protocol alignment risk**: the app builds NimBLEOta COMMAND/RECV_FW packets by hand (FirmwareUpdateService) against `h2zero/NimBLEOta`'s expected framing. Any version drift in the library's packet layout (header byte order, last-packet marker `0xFF`, CRC position) silently breaks OTA. There is no integration test on real hardware yet (status.md: Phase 6 bench test pending). **Do not ship OTA to the field until the bench test passes and the MTU/packet-size fix above is verified on-device.**

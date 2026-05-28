# DeepSeek Branch Audit — deepseek vs master

**Date:** 2026-05-28
**Branch under review:** `deepseek` (15 commits ahead of `master`, last commit `d0fda3b`)
**Scope:** Firmware (`WaterTank.ino`), BLE service stack, app context, screens, storage, tests, package config.
**Diff size:** 41 files, +2455 / −11523 (mostly `package-lock.json` deletion).

---

## CRITICAL

### DS-01: Production firmware ships with `bleVisible = true` override (security regression)

- **File:** `firmware/WaterTank/WaterTank.ino:266-268`
- **What:** `nvsLoadAuth()` ends with a hard-coded `bleVisible = true;` that overrides the entire claimed-device privacy model. The comment marks it `DIAGNOSTIC` and says "Revert to `bleVisible = !claimed` after confirming advertising works."
- **Why it matters:** The Tapo-style auth model relies on a claimed board being radio-silent until the owner explicitly opens a visibility window (via BOOT short-press or the app's `setVisibility` write). With this override active, **every claimed board in the field continuously advertises its WaterTank service UUID** — any nearby attacker can discover it and attempt brute-force auth against the SHA256-salted hash (the only remaining barrier). This invalidates the security narrative described in the codebase. It also burns radio battery 24/7 on what is a battery-powered field device per `project_production_target.md`.
- **Fix:** Restore `bleVisible = !claimed;`. The disconnect-reopens-visibility-for-60s logic added in commit `60a9de8` already solves the original "radio silent after disconnect" issue this diagnostic was meant to confirm — the diagnostic is now redundant.

### DS-02: Firmware calls `NimBLEDevice::deleteAllBonds()` on every boot

- **File:** `firmware/WaterTank/WaterTank.ino:778-779`
- **What:** Just after `NimBLEDevice::init(deviceName)`, every boot wipes the bond table. Comment: `DIAGNOSTIC: clear bonds so whitelist doesn't hide service UUID from unresolved scanners`.
- **Why it matters:** `setSecurityAuth(true, …)` requests Just-Works bonding. Bonds are how phones avoid re-pairing on every reconnect. Wiping bonds every boot means:
  1. Encrypted-link reconnect is impossible after any power cycle.
  2. The Android Bluetooth cache on the phone now holds a bond for a peer that has forgotten the LTK → silent connection failures, "device went away" UX bugs, and the phone may even refuse to reconnect without manual "Forget device" in OS settings.
  3. NVS wear: bond table writes on every boot for what is supposed to be persistent state.
- **Fix:** Delete this line. The bond table only contains entries that the board+phone agreed on; whitelisting is not enabled (we never call `setWhitelist`), so unresolved scanners are not being filtered. The advertising-suppression behaviour is a function of `bleVisible`, not bonds.

### DS-03: `--reset-board` path in e2e_test.py raises AttributeError

- **File:** `scripts/e2e_test.py:682`
- **What:** `mod = importlib.util.load_from_spec(spec)` — `load_from_spec` does not exist in `importlib.util`. The correct API is `importlib.util.module_from_spec(spec)`.
- **Why it matters:** Anyone invoking `python3 scripts/e2e_test.py --reset-board` (the documented production smoke-test workflow) hits an immediate `AttributeError`. The branch's session log claims "all 44 audit findings resolved, e2e_test.py Phase 6 green" — but this code path has never executed successfully.
- **Fix:** `mod = importlib.util.module_from_spec(spec)`.

---

## HIGH

### DS-04: Persisted firmware version is global, not per-device

- **File:** `services/BLEService.ts:129-132`, `BLEService.ts:587-589`
- **What:** App stores `@watertank_fw_version` as a single AsyncStorage key. On `start()` it emits that version into device state before any board is connected.
- **Why it matters:**
  - When the user has multiple paired boards (an explicit supported flow per `getPreferredDevice` work), the wrong fw version is displayed and is fed into `checkFirmwareUpdate(version)` → could surface a false "Update available" prompt for a device that is already current, or hide a real update for a board on older firmware.
  - The version is emitted on `start()` even if the BLE radio is off — `deviceState.connected` is false but `firmwareVersion` is populated. The throttle in `DeviceContext` then runs a GitHub fetch on every cold start without a real connection.
- **Fix:** Either scope the key by paired MAC (`@watertank_fw_version_<mac>`) or only emit it after `tryDirectConnect`/scan confirms which device we're talking to.

### DS-05: `connectToDevice` does not disconnect any existing connection first

- **File:** `services/BLEService.ts:260-277`
- **What:** Manual device-selection path. Clears `scanTimer`/`reconnectTimer` but never inspects `this.device`. If the user opens the scan sheet while already connected and taps a different MAC, the new `mgr.connectToDevice` runs while the old GATT session is still attached.
- **Why it matters:** react-native-ble-plx will queue or fail the second connect on some platforms; the old `monitorCharacteristic` subscriptions are still firing into `setupConnectedDevice` state. Best case: confusing notifications from the wrong board. Worst case: writing AUTH/FILL_TARGET to one board while the user thinks they're talking to another → wrong motor turned on/off.
- **Fix:** Before `mgr.connectToDevice`, call `this.device?.cancelConnection?.()` (or call the existing teardown) and wait for `onDisconnected`.

### DS-06: `LogCtrl ACK` triggers `nvsClearEvents()` — 64 NVS removes per sync, also breaks "events survive power cycles"

- **File:** `firmware/WaterTank/WaterTank.ino:482`, `nvsClearEvents` at 115-127
- **What:** When the app writes 0x02 (ACK) after streaming logs, the board calls `nvsClearEvents()` which removes all 64 `evt_<i>` keys plus 3 metadata keys.
- **Why it matters:**
  1. NVS write amplification: each `pushEvent` writes 4 keys (`evt_<idx>`, `evt_head`, `evt_cnt`, `evt_nextid`), and each successful sync deletes 67 keys. ESP32 NVS uses wear-leveling but a single flash sector has finite endurance (~100k erases). On a busy day with 50 motor events, you accumulate 200 NVS writes + 67 deletes per sync — easily 5,000+ NVS ops per week. The `v1.4.0` changelog promises "Event ring buffer persisted to NVS — survives power cycles", but this design defeats the purpose for already-synced events.
  2. Race: between ACK arriving and `nvsClearEvents()` completing, new events can call `pushEvent`. The `nvsClearEvents` then sets `eventHead=0, eventCount=0`, blowing away any event added in that window.
- **Fix:** Only delete `evt_<idx>` entries that were actually streamed (track high-water-mark via `nextEventId`). Or, simpler: only persist on power-loss handler, not on every event. Or: skip `nvsClearEvents` entirely and let the ring overwrite itself naturally — events already in the app's SQLite are the source of truth.

### DS-07: `nvsLoadEvents()` truncation recomputes `eventHead` with wrong formula

- **File:** `firmware/WaterTank/WaterTank.ino:119-125`
- **What:** When a corrupt entry is found at offset `i`, the code does:
  ```
  eventCount = i;
  eventHead = (eventHead + EVENT_BUF_SIZE - eventCount) % EVENT_BUF_SIZE;
  ```
- **Why it matters:** The valid entries we kept live at slot range `(origHead − origCount)..(origHead − origCount + i − 1)` (mod). The new head should point one past the last kept slot, i.e. `origHead − origCount + i`. The formula above yields `origHead − i`, which is only correct in the degenerate case `origCount = 2i`. On corruption recovery the buffer indices and what `nvsLoadEvents` thinks is the "next slot" diverge → subsequent `pushEvent` may overwrite the wrong slot, and the next reboot's `nvsLoadEvents` will load garbage and re-truncate.
- **Fix:** Save the original count before the loop and use the proper math: `eventHead = (origHead - origCount + i + EVENT_BUF_SIZE) % EVENT_BUF_SIZE;`

### DS-08: `deleteAllBonds` + `setSecurityAuth(true,…)` mismatch breaks first-connect encryption

- **File:** `firmware/WaterTank/WaterTank.ino:773` + `:779`
- **What:** Setup calls `NimBLEDevice::setSecurityAuth(true, false, true)` (bonding, secure connections) and immediately wipes bonds. On the next connection, the phone may present an LTK from a previous bond that no longer exists on the board → encryption negotiation fails or downgrades.
- **Why it matters:** Connected to DS-02. Either we want bonding (then don't wipe), or we don't (then disable `setSecurityAuth`). Currently the configuration is internally inconsistent and the actual encryption posture in the field is undefined.
- **Fix:** Remove the `deleteAllBonds()` call. Bonding is part of the intended design (`v1.4.0` line says "channel encryption"), so leave the LTK table populated across boots.

### DS-09: `pendingRestart` after OTA does not stop BLE notifications cleanly

- **File:** `firmware/WaterTank/WaterTank.ino:332-336` and `:868-871`
- **What:** OTA complete sets `pendingRestart=true; restartAt = millis()+2000;` instead of `delay(2000); esp_restart();`. Loop checks at top: `if (pendingRestart && millis() >= restartAt) esp_restart();`
- **Why it matters:** Good in principle (avoids `delay()` during OTA cleanup), but during the 2s window the main loop continues to run — including `tickAutomation`, which can fire `pushEvent` (writing NVS). If OTA happens to coincide with motor state change, an event is written to the *current* partition's NVS, but the next boot may run from the *new* OTA partition with a different NVS namespace alignment — corruption risk is small but non-zero. Worse: `loopLogStream` may run mid-OTA-shutdown and trigger BLE notifies on a stack that's about to reboot.
- **Fix:** As soon as `pendingRestart` is set, gate the rest of the loop body: `if (pendingRestart) { if (millis() >= restartAt) esp_restart(); return; }` — placed before automation/notify/log code.

### DS-10: Lockfile deleted; `@react-native/jest-preset` versions drift from React Native

- **File:** `package.json`, `package-lock.json` (deleted, +.gitignore line 53)
- **What:** The 11k-line lockfile is gone and gitignored. Devs and CI now resolve transitive deps freely. Additionally `@react-native/jest-preset: ^0.85.3` is paired with `react-native: 0.81.5` — major version mismatch (jest-preset 0.85 targets RN 0.85's internals).
- **Why it matters:** A production motor controller should have reproducible builds. APK behaviour now depends on whoever ran `npm install` most recently. The jest-preset mismatch will likely cause silent test failures or false greens.
- **Fix:** Restore the lockfile (remove from .gitignore and commit `package-lock.json`), align `@react-native/jest-preset` to `~0.81.0` to match RN 0.81.

---

## MEDIUM

### DS-11: `firmwareUpdate` GitHub fetch fires from persisted version before any board connection

- **File:** `services/BLEService.ts:130` → `context/DeviceContext.tsx:117-132`
- **What:** Cold start emits `firmwareVersion` from AsyncStorage. The effect in `DeviceContext` runs `checkFirmwareUpdate` against this version — possibly hitting the network before BLE is even initialised.
- **Why it matters:** GitHub rate limit (60/hr unauthenticated). For a connected app this is fine; for an app the user opens many times offline it's wasted bandwidth and a guaranteed silent failure that pollutes `CrashReportService` logs.
- **Fix:** Only emit `firmwareVersion` after a real BLE characteristic read confirms it.

### DS-12: `KeyboardAwareScrollViewCompat` wraps `Modal` content but `flex:1` parent removed

- **File:** `components/PairingSheet.tsx` (diff lines 44-50), `DeviceSetupModal.tsx`, `DeviceScanSheet.tsx`
- **What:** The outer `View` lost its `justifyContent: "flex-end"` (it's now passed to `contentContainerStyle`). On Android, when the keyboard is open, this works, but when there is no keyboard the scroll view's content may not pin to the bottom as before.
- **Why it matters:** Visual regression on the password sheet — the modal may render at top of screen instead of bottom. Should be verified on a physical device.
- **Fix:** Verify visually on Android 12+ and iOS; if needed restore the outer `flex:1, justifyContent:"flex-end"` wrapper or set `contentContainerStyle={{ flexGrow:1, justifyContent:"flex-end" }}` (which is already done) — confirm with screenshot.

### DS-13: `tryDirectConnect` mutates `sessions` array in place

- **File:** `services/BLEService.ts:401-408`
- **What:** `sessions.splice(idx, 1)` followed by `sessions.unshift(p)` mutates the array returned by `AuthService.listSessions()`. While `listSessions()` currently rebuilds the array each call (so this is safe today), future refactors that memo/cache that result will silently break.
- **Why it matters:** Hidden coupling. Code smell rather than a bug.
- **Fix:** Use `const ordered = [preferred, ...sessions.filter(s => s.deviceMac !== preferred)]`.

### DS-14: `connectedFwVersion` global lives outside the class

- **File:** `services/BLEService.ts` (reference at line 588 outside the diff hunk, var declared at top of file)
- **What:** `connectedFwVersion` is module-level state. On a second BLEService instance (which can't happen given the singleton, but…) it leaks across.
- **Why it matters:** Minor; only a concern if the dev mode hot-reload creates a second service. Not load-bearing today.
- **Fix:** Move to instance field, or document why it's module-scope.

### DS-15: Removed `PUMP_STATE_LABELS` and `TANK_FULL_PCT`/`TANK_LOW_PCT`/etc. constants

- **File:** `models/Event.ts` (-9 lines), `constants/thresholds.ts` (-7 lines)
- **What:** `PUMP_STATE_LABELS`, `TANK_FULL_PCT`, `TANK_WARN_BLINK_PCT`, `FLOW_ZERO_TIMEOUT_MS`, `SENSOR_POLL_MS`, `BLE_NOTIFY_INTERVAL`, `DATA_RETENTION_DEFAULT_DAYS` deleted. `DeviceContext` still imports `DATA_RETENTION_DEFAULT_DAYS` and `TANK_LOW_PCT` per the import on line 12.
- **Why it matters:** If those imports remain consumed and the constants are gone, the app will fail to build. Need to confirm `DATA_RETENTION_DEFAULT_DAYS` and `TANK_LOW_PCT` are still exported from somewhere — diff shows the file went from 8 lines to 1, but the import path still resolves.
- **Fix:** Run `tsc --noEmit` against deepseek branch and confirm. If broken, restore the constants or update all imports.

### DS-16: `getAllEvents()` query change limits to most recent 5000 events

- **File:** `storage/database.ts:172`
- **What:** Subquery now selects most recent 5000 events then re-sorts ascending. Old query returned all events.
- **Why it matters:** Records screen is now silently capped. A long-running install (1+ year, ~10 events/day = 3650 events — still under cap) is fine, but a device run for 2+ years will silently drop historical data from the UI even though it's in the DB. The DB itself is still pruned by `DATA_RETENTION_DEFAULT_DAYS`, so the gap is between retention setting and 5000.
- **Fix:** Either document the 5000 cap or wire pagination into the records screen.

### DS-17: `clearAllSessions` and "preferred device" key are not coupled

- **File:** `services/AuthService.ts:30-58` (existing), `:60-76` (new)
- **What:** `clearAllSessions()` removes `@watertank_auth` but leaves `@watertank_preferred_device` in storage. After "Remove All Paired Devices", the app still believes a MAC is preferred and will try to direct-connect to it.
- **Why it matters:** User flow: remove pairing → app tries to direct-connect to a now-unauthenticated MAC → silent failure, the user thinks the remove succeeded but reconnect is broken. Minor UX bug.
- **Fix:** In `clearAllSessions`, also `AsyncStorage.removeItem("@watertank_preferred_device")`.

### DS-18: NVS event persistence on every event causes flash wear

- **File:** `firmware/WaterTank/WaterTank.ino:613-616`
- **What:** Every `pushEvent` writes 4 NVS keys. With Witty Fox Storm Board (ESP32-WROVER, ~100k erase cycles per sector), this is fine for normal use, but combined with DS-06's clear-on-sync this is 200+ ops per active hour during heavy use.
- **Why it matters:** Long-term reliability of field devices. Not a blocker but worth measuring.
- **Fix:** Batch writes — only `prefs.putUChar("evt_head", …)` every N events, accept losing up to N events on power loss. Or use a custom byte-aligned binary format and write once per minute.

### DS-19: SimulationService event IDs collide with board event IDs in 8 years

- **File:** `services/SimulationService.ts:7-10` and `models/Event.ts:81-84`
- **What:** App-generated IDs now use `APP_EVENT_ID_PREFIX = 0x40000000` (bit 30). Board IDs start at 1, increment. The 30-bit space gives ~1B simulation IDs before wrap, and the board's 32-bit space can theoretically reach 0x40000000 in ~68 years at 1 event/sec.
- **Why it matters:** Realistically a non-issue, but the documentation in the comment says "high-bit prefix to avoid collisions" — bit 30 isn't the high bit. Use `0x80000000` to be safe.
- **Fix:** `export const APP_EVENT_ID_PREFIX = 0x80000000;` (and accept the JS bitwise sign issue by using `>>> 0` when comparing).

### DS-20: e2e test fakes pass for missing UI elements

- **File:** `scripts/e2e_test.py:528-530`, `:573-575`, `:594-595`, `:601-603`
- **What:** Several test cases record `True` with "SKIPPED" detail when the UI element they expect isn't found (E2E_06 week toggle, E2E_08 dark/Hindi/English buttons, E2E_09 preferred device).
- **Why it matters:** The session log claims "all 44 audit findings resolved, Phase 6 e2e green" — but the green is achieved partly by counting skipped checks as passes. This is a real risk: a UI regression that removes the dark-mode button would still report PASS.
- **Fix:** Use a distinct status (`SKIP`) and don't count it toward `passed`.

---

## LOW

### DS-21: `pushScheduled = 800ms` removed from `onConnect`, replaced with subscribe-driven push

- **File:** `firmware/WaterTank/WaterTank.ino:273`, new `StateCharCB` at 298-303
- **What:** Initial state push now triggered by CCCD subscribe write rather than an 800ms timer.
- **Why it matters:** Generally an improvement (more reliable). Verify the app actually subscribes promptly (`monitorCharacteristicForService` in BLEService does this). If subscribe is delayed, initial state shows blank longer than the old 800ms.
- **Fix:** Keep, but verify app-side latency in field test.

### DS-22: AsyncStorage import added to BLEService but no error handling for very early access

- **File:** `services/BLEService.ts:11`, `:130-132`
- **What:** First access to AsyncStorage now occurs in `BLEService.start()`. If AsyncStorage native module isn't ready (unlikely but possible on first cold start before bridge init), the `.catch(() => {})` swallows it silently.
- **Why it matters:** A swallowed error here is harmless but consistent with the silent-failure pattern flagged in the repo's coding rules.
- **Fix:** Log to CrashReportService via `logBleError`.

### DS-23: Hardcoded magic numbers for sensor geometry

- **File:** `firmware/WaterTank/WaterTank.ino:67-71`
- **What:** `TANK_HEIGHT_CM 120.0f`, `TANK_FULL_DIST_CM 15.0f` etc. Defines, not configurable from app.
- **Why it matters:** Each install has a different tank. Need an app-side characteristic write or compile-time guidance in setup docs.
- **Fix:** Either expose via a new BLE characteristic + NVS-backed storage, or add a clear comment that this requires firmware recompile per install.

### DS-24: `BlePairingSheet` onUnmount race fix uses non-atomic `connectedRef` check

- **File:** `components/BlePairingSheet.tsx:46-50, 95-100`
- **What:** New `connectedRef` pattern to disconnect orphan connections when unmounted between `device.connect()` resolving and `onSuccess()` firing.
- **Why it matters:** The flag is set after await, then cleared if `mountedRef.current`. If unmount happens between the assignment to `connectedRef.current = device` and the `if (mountedRef.current)` check, both could run — the connection is correctly disconnected. Looks correct.
- **Fix:** No action; flagged for reviewer awareness only.

### DS-25: Removed `BLE_DEVICE_NAME` constant; only `isTankDevice` substring check remains

- **File:** `constants/ble.ts:1-3`
- **What:** `BLE_DEVICE_NAME = "WaterTank"` removed. Code now relies on `isTankDevice(name)` substring check.
- **Why it matters:** A malicious peer could advertise as `MyWatertankIsFun` and pass the filter. Combined with DS-01 (board always advertising), the substring check makes spoofing easier — but auth still gates real harm.
- **Fix:** Tighten to exact-prefix match (`name?.toUpperCase().startsWith("WATERTANK")`).

### DS-26: Hindi `errorMessage` says "reload" but app has no reload action

- **File:** `constants/i18n.ts:540` (and equivalents)
- **What:** `errorMessage: 'कृपया ऐप को पुनः लोड करें।'` — "Please reload the app." But the only action is `errorTryAgain` which calls `resetError()`, not a process restart.
- **Why it matters:** Confusing UX for non-technical rural users.
- **Fix:** Either implement actual restart (`RNRestart.Restart()`) or rephrase: "Try again to continue."

### DS-27: `tsconfig.json` lost `ignoreDeprecations: "6.0"` flag

- **File:** `tsconfig.json:5` (removed)
- **What:** With strict TS 5.9, removing the suppression may surface deprecation warnings. The branch claims "+ tsconfig" in `v43` commit message.
- **Why it matters:** Build noise but not blocker.
- **Fix:** Confirm `tsc --noEmit` is clean on this branch.

### DS-28: Removed components (StatusDot, TankLevelBar) — dead code or referenced elsewhere?

- **File:** Deleted `components/StatusDot.tsx`, `components/TankLevelBar.tsx`
- **What:** Both components removed entirely.
- **Why it matters:** Need to confirm no imports remain.
- **Fix:** `grep -r "StatusDot\|TankLevelBar"` to confirm zero references.

---

## VERDICT

### MERGE-WITH-FIXES

Three CRITICAL items are hard blockers (DS-01, DS-02, DS-03). They are also the smallest changes in the whole branch — minutes to fix.

Once those three plus the four HIGH firmware items (DS-06, DS-07, DS-08, DS-09) and the two HIGH app items (DS-04, DS-05) are addressed, the branch becomes a substantial production-quality upgrade: per-device salt, BLE-only production gate, sensor driver, paired-device list, manual scan UI, ring-buffer persistence, jest harness, i18n completeness, and proper schema migration. The architectural direction is right; only the diagnostic carve-outs and a handful of correctness bugs need cleanup before this controls real motors.

**Blockers (must fix before merge):**

- **DS-01** — Remove `bleVisible = true` override in `nvsLoadAuth()` (firmware:268). Production boards must respect the claimed/visibility model.
- **DS-02** — Remove `NimBLEDevice::deleteAllBonds()` from `setup()` (firmware:779). Wiping bonds every boot breaks encrypted reconnect.
- **DS-03** — Fix `importlib.util.load_from_spec` → `module_from_spec` in `scripts/e2e_test.py:682`. The "all e2e green" claim is untrue along the `--reset-board` path.

**Should-fix before next field release (HIGH):**

- DS-04 per-device fw version key
- DS-05 disconnect-before-connect in manual flow
- DS-06 stop wiping all NVS event keys on every sync ACK
- DS-07 fix nvsLoadEvents corruption-recovery head math
- DS-08 reconcile bonding intent (depends on DS-02)
- DS-09 gate loop body during `pendingRestart`
- DS-10 restore `package-lock.json` and align jest-preset version

**Acceptable to defer (MEDIUM/LOW):** DS-11 through DS-28 — quality and polish items, no safety impact.

No findings indicate a risk of *unintended motor runs* directly — the automation state machine path (`tickAutomation` reorder so `tankPct >= fullTankPct` is checked before `!inlet`) is actually safer than master (motor stops at full even if inlet flicker keeps reporting true). Auth path remains intact. The CRITICALs are all radio-layer/security exposure, not motor control.

# WaterTank App — Full Codebase Audit P1
_Date: 2026-05-23 | Scope: All source files post-v18 | Mode: Observe only, no fixes_

---

## BUGS

### B1 — Animation loop restarts during fill animation (performance + visual regression)
**File:** `components/WaterTankWidget.tsx:166,234`
`fillPct` is in the dependency array of the main animation `useEffect`. During the 800ms fill-on-mount animation, `fillPct` changes every 20ms (40 steps), causing the animation loop to be torn down and recreated 40 times. Each restart: clears all droplets, clears all ripples, resets wave phase. Result: pour stream and splash effects are invisible during the fill transition — the exact moment users first see the widget.

### B2 — Tank-full toast fires incorrectly on reconnect after pump-while-disconnected
**File:** `app/(tabs)/index.tsx:136-146`
Toast condition: `prevPumpStateRef.current === 3 && deviceState.pumpState === 0`. `BLEService.stop()` emits `{ ...this.state, connected: false }` without resetting `pumpState`. If the motor was running when BLE drops, `pumpState` stays 3 in `deviceState`. On next reconnect, when the device sends `pumpState: 0`, the toast fires — even if the motor stopped hours ago. False "Tank is full!" celebration.

### B3 — SimulationService `stepComplete` race condition
**File:** `services/SimulationService.ts:160-173`
`this.running = false` is set before `this.timers.push(id)`. If `stop()` is called in this gap: `stop()` calls `this.timers.forEach(clearTimeout)` but `id` isn't in `this.timers` yet, so it's not cancelled. When 300ms elapses, `this.timers.includes(id)` returns true (push already ran), so `this.onComplete?.()` fires on a stopped service. Causes DeviceContext to restart BLE unexpectedly.

### B4 — `requestLogStream` subscription not cleaned up on monitor error
**File:** `services/BLEService.ts:364-367`
In the error branch of `monitorCharacteristicForService`, `sub.remove()` is called but `this.subscriptions = this.subscriptions.filter(s => s !== sub)` is NOT. The dead subscription stays in `this.subscriptions`, accumulates over repeated sync failures, and gets iterated on cleanup — calling `.remove()` on already-removed subscriptions (may throw on some BLE implementations).

### B5 — `updateSettings` stale closure
**File:** `context/DeviceContext.tsx:178-185`
`useCallback` deps include `settings`. On rapid sequential `updateSettings` calls (e.g., user tapping retention chips quickly), the second call could use a stale snapshot of `settings` from before the first update applied, overwriting the first change. Should use `setSettings(prev => ({ ...prev, ...patch }))`.

### B6 — BLE tank percent not range-clamped before emit
**Files:** `services/BLEService.ts:307-313` and `services/BLEService.ts:286-294`
`parseFloat(str)` from `BLE_CHAR_TANK` and `parsed.tank` from `BLE_CHAR_STATE` are emitted without clamping to `[0, 100]`. Malformed ESP32 output (e.g., `105`, `-3`, `NaN`) propagates to all listeners. The UI clamps via `Math.max(0, Math.min(100, pct))` in WaterTankWidget but `DeviceState.tank` can carry an out-of-range value, breaking `litresValue` calculations and tank-low notifications.

### B7 — `notifyMotorOff` always passes `StopReason.NONE`
**File:** `context/DeviceContext.tsx:196`
```ts
NotificationService.scheduleMotorOff(deviceState.tank, 0, tRef.current)
```
Stop reason is hardcoded to `0` (NONE). `DeviceState` does not carry the stop reason — it's only in `WaterEvent`. Notification body never shows "Tank Full" or "Water supply ended", always falls through to the plain `tankLevel: X%` body.

### B8 — BlePairingSheet creates a second BleManager conflicting with BLEService singleton
**File:** `components/BlePairingSheet.tsx:29`
`new BleManager()` creates a new instance. `BLEService.ts` uses a global `_managerInstance` singleton. Two simultaneous BLE managers can cause scan conflicts, connection failures, or `GATT_SERVER` errors on Android. Additionally, `BlePairingSheet.connect()` calls only `device.connect()` — no `discoverAllServicesAndCharacteristics`, no time sync. BLEService then tries its own scan/connect on top. Double-connection attempts are fragile.

### B9 — Database compound primary key allows duplicate events
**File:** `storage/database.ts:33-35`
```sql
PRIMARY KEY (id, epoch)
```
Two rows with the same `id` but different `epoch` can coexist. BLE sync and simulation both use timestamp-based IDs (`Date.now()`) so collisions are rare, but if a BLE event arrives with the same ID as a simulation event (possible after app restart with hot-reload), both rows insert. Only one will display correctly.

### B10 — `sync_log` table grows unbounded
**File:** `storage/database.ts:129-133`
Every BLE sync and every simulation cycle adds a row. No pruning query exists. `deleteOldEvents` only prunes `events`. After months of daily syncs, `sync_log` grows to thousands of rows. `getLastSyncTime()` scans it every call.

---

## LOGIC GAPS

### L1 — `lastKnownTank` lost on app restart
**File:** `app/(tabs)/index.tsx:107`
`lastKnownTank` is in-memory React state. After closing and reopening the app while disconnected, it resets to `null`, hiding the tank visual entirely. Should persist to AsyncStorage alongside other settings, or incorporate into `AppSettings`.

### L2 — Countdown hardcoded to 45, not using `STARTUP_DELAY_MS`
**File:** `app/(tabs)/index.tsx:102,128` vs `constants/thresholds.ts:6`
UI initializes countdown at literal `45`. `STARTUP_DELAY_MS = 45000` exists but is unused here. If hardware startup delay changes, the UI counter stays wrong.

### L3 — Records pull-to-refresh doesn't actually re-query DB
**File:** `app/(tabs)/records.tsx:59-62`
`onRefresh` increments `internalKey` (used as FlatList `key`) but the `events` useMemo depends on `getEventsForDate` reference. `getEventsForDate` only gets a new reference when `refreshKey` changes in DeviceContext (i.e., on BLE state update). Pull-to-refresh causes a FlatList remount with the same stale data.

### L4 — Weekly stats date comparison mixes UTC and localtime
**File:** `app/(tabs)/records.tsx:82-83`
`sevenDaysAgoStr = new Date(...).toISOString().slice(0, 10)` is UTC date.
`getDailyStats` groups by `date(epoch, 'unixepoch', 'localtime')` — IST local date.
For IST users (+5:30), these diverge: a record at 11:30 PM IST on day D is 5:30 PM UTC on day D-1. The week filter boundary is off by a day, causing the first day of the "week" to sometimes be excluded or wrong.

### L5 — `pumpState` not reset to 0 on BLE disconnect
**File:** `services/BLEService.ts:100-103`
`stop()` emits `{ ...this.state, connected: false }`. If `pumpState` was 3 (pumping), the dashboard motor card continues to show "Motor Running · Water Arrived" after disconnect. State should reset to idle on disconnect.

### L6 — Tab bar labels not translated
**File:** `app/(tabs)/_layout.tsx:59-77`
`title: 'Dashboard'`, `'Records'`, `'Settings'` are hardcoded English strings. Hindi/Marathi/Kannada users see English tab names. These should use `t('tabDashboard')`, etc., but `_layout.tsx` doesn't have access to `useLanguage` inside `screenOptions` as written. Needs a wrapper pattern.

### L7 — Onboarding last page footer button shows wrong label
**File:** `app/onboarding.tsx:179`
On page 3 (last), footer Next button shows `t('ob3SkipBtn')` ("Skip for now"). There's also a separate skip link already on page 3. Two "Skip for now" elements on the same screen with different behaviors. The footer button should show `t('getStarted')`.

### L8 — `formatDayLabel` hardcodes "Today" / "Yesterday" in English
**File:** `utils/formatters.ts:56-57`
Returns hardcoded English strings regardless of `lang` param. Not used in the current app but exported and could be used by future screens.

### L9 — `notifyManualOverride` setting is dead code
**File:** `context/DeviceContext.tsx:31,44`
`AppSettings.notifyManualOverride` is defined and persisted. No UI toggle exists in `settings.tsx`. No `NotificationService` call triggers it anywhere. Silent orphan.

### L10 — `scrollEnabled={false}` on dashboard — no scroll fallback
**File:** `app/(tabs)/index.tsx:188`
ScrollView `scrollEnabled={false}` means overflow content (on small screens or with litres pill + last-known badge) is clipped with no user recourse.

### L11 — `ThemeContext` defaults to 'light' before AsyncStorage resolves
**File:** `context/ThemeContext.tsx:19-26`
Theme defaults to `'light'`, then corrects to `'dark'` asynchronously. Dark-mode users see a flash of white/light background on every cold start. No loading gate.

### L12 — `startBleService()` on sim completion ignores user's retentionDays
**File:** `context/DeviceContext.tsx:160`
`this.onComplete` calls `startBleService()` with no argument, so `retentionDays` falls back to `DEFAULT_SETTINGS.retentionDays` (60). If user has set 30 or 90, events won't be pruned correctly after simulation ends.

---

## PERFORMANCE

### P1 — Animation loop causes 3× setState per tick
**File:** `components/WaterTankWidget.tsx:182-231`
At 25fps (motorOn), each interval calls `setWavePhase`, `setPourFlicker`, and `setDroplets` or `setRipples` — three separate React state updates, each scheduling a re-render. Should be merged into a single state object or moved to a `useRef` + `requestAnimationFrame` pattern, or fully ported to `react-native-reanimated` (already a dep) for native-thread execution.

### P2 — Wave paths rebuilt every render, not memoized
**File:** `components/WaterTankWidget.tsx:240-242`
`buildWavePath` iterates `CW/6 ≈ 29` times per call. Called on every render (25fps × 2 waves = 50 path-builds/sec). No `useMemo`. Should memoize on `(surfaceY, wavePhase, waveAmp, CX, CY, CW, CH)`.

### P3 — `refreshKey` invalidates all DB callbacks on every BLE state update
**File:** `context/DeviceContext.tsx:128,228-231`
`setRefreshKey(k => k + 1)` fires on every BLE state update (every 2s). `getEventsForDate`, `getStats`, `getDbInfo` all depend on `refreshKey`. Records screen triggers `getEventsForDate` on every 2s tick even when idle. Should only increment `refreshKey` when actual DB writes happen (new events, sync log), not on every state update.

### P4 — `bleLog.slice(0, 50)` in render — no virtualization
**File:** `app/(tabs)/settings.tsx:575`
BLE log renders up to 50 rows as plain `Text` inside a `ScrollView` (max 240px height). Not a FlatList. At high frequency events, this rerenders many text nodes on every log append.

---

## ARCHITECTURE / DESIGN

### A1 — BlePairingSheet imports `react-native-ble-plx` directly (will crash on web/Expo Go)
**File:** `components/BlePairingSheet.tsx:11`
```ts
import { BleManager, Device } from 'react-native-ble-plx';
```
This is a top-level (non-dynamic) import. In Expo Go or web where the native module isn't available, this crashes the entire `onboarding` screen. `BLEService.ts` correctly uses `try { require(...) } catch` pattern. `BlePairingSheet` should do the same.

### A2 — Two separate BLE device detection strategies
- `BlePairingSheet`: scans for any device with name containing `'WATERTANK'` (case-insensitive).
- `BLEService.startScan`: checks for `dev.name === BLE_DEVICE_NAME` (exact match `"WaterTank"`).
These will produce different results if device advertises `"WATERTANK"` or `"watertank-01"`. Should share the same detection predicate.

### A3 — `@react-native-async-storage/async-storage` is in devDependencies
**File:** `package.json:53`
AsyncStorage is used at runtime (DeviceContext, ThemeContext, LanguageContext, onboarding). Listing it as a devDependency is incorrect — it won't be bundled in production builds unless the native prebuild resolves it separately. This could cause silent failures in release builds.

### A4 — `@tanstack/react-query` and `zod` in devDependencies, unused
**File:** `package.json:57-58`
Neither `@tanstack/react-query` nor `zod` is imported anywhere in the current source. Orphan dependencies — probably from an earlier design. Add noise to the dependency graph.

### A5 — BLE UUIDs in mixed case (may fail matching on Android)
**File:** `constants/ble.ts:1-7`
UUIDs like `"4FAFC201-1FB5-459E-8FCC-C5C9C331914B"` are uppercase. `react-native-ble-plx` on some Android versions lowercases UUIDs internally. Characteristic subscriptions or writes that use these constants directly may silently fail if the device advertises them in lowercase. Should normalize to lowercase.

### A6 — Settings schema has no migration mechanism
**File:** `context/DeviceContext.tsx:107`
```ts
const loaded: AppSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
```
Spread handles additive changes (new keys default-filled). Does not handle removed keys (stale data persists) or type-changed keys. If `tankColor` was ever a boolean in an early build, it would override the `'black' | 'blue'` type silently. No version field in settings schema.

### A7 — `exportData` has no size limit — can produce very large CSV
**File:** `context/DeviceContext.tsx:238`
`getAllEvents()` returns all rows with no limit. After months of daily pump cycles (2-4 events/day), this could be thousands of rows. `Share.share` with a large string can timeout or fail silently on Android.

### A8 — Dead stub screens pollute source tree
**File:** `app/(tabs)/today.tsx`, `app/(tabs)/stats.tsx`, `app/(tabs)/history.tsx`
All three return `null`. They're suppressed in `_layout.tsx` (`href: null`) but still exist as source files and contribute to Metro's module graph.

### A9 — `getTankColor` utility is exported but never used
**File:** `utils/formatters.ts:92-101`
Dead export. Adds surface area to the module.

### A10 — `motorOn` and `pumpState` can be mutually inconsistent
**File:** `models/Event.ts:29-36`
`DeviceState` carries both `motorOn: boolean` and `pumpState: number`. `pumpState === 3` implies `motorOn === true`, but they're set independently from the BLE JSON. No invariant enforcement. Dashboard uses `motorOn` for animation, `pumpState === 2` for countdown — if they diverge, the UI shows contradictory info.

### A11 — No Bluetooth permission request before BLE operations
**File:** `app/_layout.tsx:84-86`, `services/BLEService.ts`
On Android 12+, `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` permissions must be requested at runtime before BLE operations. The app requests notification permissions on mount but never requests BLE permissions. BLE scan will silently fail or throw on Android 12+ until the user grants permissions through the OS dialog triggered by the OS (not the app). Should use `expo-permissions` or `PermissionsAndroid` before first scan.

### A12 — No offline graceful degradation for DB init failure
**File:** `context/DeviceContext.tsx:87-89`
```ts
try { initializeDatabase(); } catch (e) { console.error("DB init failed:", e); }
```
If SQLite init fails (e.g., storage full), the app continues with a null DB. All subsequent DB calls return empty arrays silently. User sees no data, no error message. Should surface a toast or alert.

---

## UX GAPS

### U1 — No way to stop a running simulation
Once `runSimulation()` is called, there is no cancel/stop button. The simulation runs for ~20 seconds. User is stuck watching it. The dev mode option is disabled while running (`disabled={simMode}`). No escape hatch.

### U2 — No notification for manual override despite setting existing
Settings model has `notifyManualOverride` (see L9). The `pumpManual` banner appears on screen but no push notification fires. Users who rely on notifications won't be alerted.

### U3 — Weekly stats shows raw ISO date strings (e.g., "2026-05-20"), not localized
**File:** `app/(tabs)/records.tsx:143`
`s.day` from `getDailyStats` returns SQLite `date()` output (ISO format `YYYY-MM-DD`). Rendered directly as a Text label — English format, not localized, not humanized. Should use `formatDayLabel` or equivalent.

### U4 — `Tank size` TextInput has no max constraint in UI (only storage)
**File:** `app/(tabs)/settings.tsx:131-136`
`saveTankSize` strips to 6 digits (max 999999 litres). No upper bound validation. A user entering 10000000 will silently have it sliced to 100000. No feedback.

### U5 — BlePairingSheet has no retry button after scan timeout
After 10s scan, `setScanning(false)` and show the found list (or "no devices found"). No retry button — user must dismiss and re-open the sheet.

### U6 — Dashboard header shows "Last sync" only when connected, but "last known" data may be from a previous session
**File:** `app/(tabs)/index.tsx:216-219`
`lastSyncAt` shown only while `deviceState.connected`. The last-known tank (from a previous connection) shows age via `formatRelativeTime(lastKnownTank.at)`, but this resets to null on restart (L1). Users can't tell if the "last known" reading is from 2 hours ago or 2 days ago after restart.

---

## SUMMARY TABLE

| # | Severity | Category | File | Description |
|---|---|---|---|---|
| B1 | High | Bug | WaterTankWidget.tsx | Animation restarts 40× during fill — effects invisible on mount |
| B2 | High | Bug | index.tsx | Tank-full toast fires incorrectly after disconnect+reconnect |
| B3 | Medium | Bug | SimulationService.ts | stepComplete race: onComplete fires on stopped service |
| B4 | Medium | Bug | BLEService.ts | Subscription not removed from array on monitor error |
| B5 | Medium | Bug | DeviceContext.tsx | updateSettings stale closure — rapid taps overwrite each other |
| B6 | Medium | Bug | BLEService.ts | Tank pct not clamped — out-of-range values emitted |
| B7 | Medium | Bug | DeviceContext.tsx | Motor-off notification always shows NONE stop reason |
| B8 | High | Bug | BlePairingSheet.tsx | Second BleManager conflicts with BLEService singleton |
| B9 | Low | Bug | database.ts | Compound PK allows duplicate event IDs |
| B10 | Low | Bug | database.ts | sync_log grows unbounded |
| L1 | High | Logic | index.tsx | lastKnownTank lost on restart — tank widget disappears |
| L2 | Low | Logic | index.tsx | Countdown hardcoded 45s, not from STARTUP_DELAY_MS |
| L3 | Medium | Logic | records.tsx | Pull-to-refresh doesn't re-query DB |
| L4 | Medium | Logic | records.tsx | Weekly date comparison mixes UTC and IST local dates |
| L5 | Medium | Logic | BLEService.ts | pumpState not reset to 0 on disconnect |
| L6 | Low | Logic | _layout.tsx | Tab labels not translated |
| L7 | Low | Logic | onboarding.tsx | Last page footer shows wrong label |
| L8 | Low | Logic | formatters.ts | formatDayLabel hardcodes English Today/Yesterday |
| L9 | Low | Logic | DeviceContext.tsx | notifyManualOverride setting is dead code |
| L10 | Low | Logic | index.tsx | scrollEnabled=false clips content on small screens |
| L11 | Medium | Logic | ThemeContext.tsx | Flash of light theme on dark-mode cold start |
| L12 | Low | Logic | DeviceContext.tsx | startBleService post-sim ignores user's retentionDays |
| P1 | High | Perf | WaterTankWidget.tsx | 3× setState/tick — should merge or use reanimated |
| P2 | Medium | Perf | WaterTankWidget.tsx | Wave paths rebuilt every frame, not memoized |
| P3 | Medium | Perf | DeviceContext.tsx | refreshKey increments on every BLE state update |
| P4 | Low | Perf | settings.tsx | BLE log not virtualized |
| A1 | High | Arch | BlePairingSheet.tsx | Top-level BLE import crashes web/Expo Go |
| A2 | Medium | Arch | BlePairingSheet+BLEService | Device name detection criteria differ |
| A3 | High | Arch | package.json | AsyncStorage in devDependencies — wrong |
| A4 | Low | Arch | package.json | @tanstack/react-query and zod unused |
| A5 | Medium | Arch | ble.ts | UUIDs uppercase — may mismatch on Android |
| A6 | Medium | Arch | DeviceContext.tsx | Settings schema has no migration/version |
| A7 | Low | Arch | DeviceContext.tsx | exportData unbounded — large CSV could fail |
| A8 | Low | Arch | app/(tabs) | Dead stub screens (today, stats, history) |
| A9 | Low | Arch | formatters.ts | getTankColor unused export |
| A10 | Medium | Arch | models/Event.ts | motorOn + pumpState can be inconsistent |
| A11 | High | Arch | _layout.tsx | No BLE permission request before scan (Android 12+) |
| A12 | Medium | Arch | DeviceContext.tsx | Silent DB init failure — no user feedback |
| U1 | Medium | UX | settings.tsx | No way to cancel a running simulation |
| U2 | Low | UX | — | Manual override has no push notification |
| U3 | Medium | UX | records.tsx | Week stats show raw ISO date, not localized |
| U4 | Low | UX | settings.tsx | Tank size input has no upper bound feedback |
| U5 | Low | UX | BlePairingSheet.tsx | No retry button after BLE scan timeout |
| U6 | Medium | UX | index.tsx | Last-known age unknown after restart |

_Total: 10 bugs, 12 logic gaps, 4 performance, 12 architecture, 6 UX = **44 findings**_

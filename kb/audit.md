# WaterTank App — Architecture & Code Audit
_Audited: 2026-05-22_

---

## Summary

Solid MVP codebase. BLE ↔ SQLite ↔ UI pipeline is sound. Main risk areas are the single-large DeviceContext, absence of tests, and a handful of hardcoded colors. All critical field contracts (WaterEvent, SQLite schema, BLE UUIDs) are consistent.

---

## Architecture Overview

```
ESP32 (BLE) ──► BLEService ──► DeviceContext ──► Screens
                                   │
                               SQLite (database.ts)
                               AsyncStorage (settings, onboarding)
                               NotificationService
```

`DeviceContext` is the god object — it owns device state, BLE log, settings, DB queries, and export. Acceptable for this scale; would need splitting beyond ~5 screens.

---

## Findings by File

### `services/BLEService.ts`
- ✅ Singleton BleManager (avoids multiple BT stack instances)
- ✅ Graceful module load guard (`bleModuleAvailable` flag)
- ✅ Reconnect with exponential backoff `[5000, 10000, 20000, 30000]`
- ✅ MTU 512 negotiated
- ⚠️ Long method bodies (>200 LOC in some handlers) — acceptable for BLE state machines
- ⚠️ `eventIdCounter` resets on each app launch; `INSERT OR IGNORE` prevents duplication via (id, epoch) composite PK

### `context/DeviceContext.tsx`
- ✅ Correct service swap: BLEService when `bleModuleAvailable`, no-op otherwise
- ✅ `simMode` not persisted — intentional
- ✅ Settings merged with `DEFAULT_SETTINGS` on load (safe schema migration)
- ⚠️ `getEventsForDate`, `getStats`, `getDbInfo` are synchronous DB calls exposed via context — can block render thread on large datasets
- ⚠️ No cleanup for `bleLog` array — grows unbounded in long sessions

### `storage/database.ts`
- ✅ Composite PK `(id, epoch)` + `INSERT OR IGNORE` prevents duplicate BLE-synced events
- ✅ `isWeb` guard on all DB calls
- ✅ Indexes on `epoch` and `type` columns
- ⚠️ `deleteOldEvents` uses wall-clock `Date.now()` which relies on device time being correct — acceptable for farm use
- ⚠️ `sync_log` table written but never read in UI — dead code or future feature

### `services/NotificationService.ts`
- ✅ `trigger: null` (immediate) — correct workaround for Expo 52 future-schedule bug
- ✅ Channel configured for Android HIGH importance with vibration
- ⚠️ `permissionGranted` is module-level state — lost on reload; re-checked lazily via `ensureChannel()`

### `services/SimulationService.ts`
- ✅ One-shot cycle, no looping
- ✅ `onComplete` callback wires back to DeviceContext for `simDone` state
- ✅ All timers cleared on `stop()`
- ⚠️ `eventIdCounter` starts at 2000 to avoid collision with BLEService counter (starts at 1) — fragile, should use UUID or timestamp-based IDs

### `models/Event.ts`
- ✅ All enums and interfaces in one place
- ✅ `EVENT_LABELS` and `STOP_REASON_LABELS` for display (but hardcoded English — see i18n note below)
- ⚠️ `EVENT_LABELS` not wired to i18n system; uses hardcoded English. `EventRow` uses `t()` separately — minor duplication

### `constants/colors.ts`
- ✅ Dual light/dark palettes
- ✅ Tank level semantic tokens (`tankEmpty`→`tankFull`) properly ordered by fill
- ⚠️ `app/(tabs)/index.tsx` (Dashboard) hardcodes several colors (`BG`, `CARD_BG`, `TEXT_DARK`, etc.) instead of using `useColors()` — inconsistency with rest of codebase

### `app/(tabs)/index.tsx` (Dashboard)
- ⚠️ 8+ hardcoded color constants at top of file (not using `useColors()`)
- ⚠️ Multiple animation loops (`PulsingDot`, `PulsingDots`) created inline — fine for now
- ✅ `bleAvailable` flag used to show/hide simulation controls

### `app/onboarding.tsx`
- ✅ Language picker on page 0 — good first-time UX
- ✅ BLE pairing sheet deferred to page 3 (optional)
- ⚠️ Some hardcoded strings ("Choose your language", multilingual alternatives) instead of `t()` — intentional since `t()` depends on selected language

### `app/index.tsx`
- ✅ Redirect logic is minimal and correct
- ✅ `catch` falls back to `tabs` (safe default for corrupt AsyncStorage)

### `utils/formatters.ts`
- ✅ All time formatting uses locale-aware `Intl` APIs
- ✅ `epoch * 1000` conversion consistent throughout
- ✅ `getDayBounds` used in DeviceContext for per-day queries

---

## Issues Summary

| Severity | Location | Issue |
|---|---|---|
| Medium | `app/(tabs)/index.tsx` | 8+ hardcoded hex colors, not using `useColors()` |
| Medium | `context/DeviceContext.tsx` | `bleLog` array unbounded — grows forever |
| Medium | `services/SimulationService.ts` | `eventIdCounter` starts at 2000 to avoid BLEService collision — fragile |
| Low | `storage/database.ts` | `sync_log` table never read in UI |
| Low | `models/Event.ts` | `EVENT_LABELS` hardcoded English, parallel to i18n `t()` in EventRow |
| Info | `context/DeviceContext.tsx` | Synchronous DB calls in context — okay at current scale |
| Info | `services/NotificationService.ts` | Module-level `permissionGranted` resets on reload |

---

## What's Working Well

- BLE state machine with reconnect backoff
- `IDeviceService` abstraction enabling simulation mode without BLE hardware
- SQLite schema with composite PK preventing duplicate event insertion
- Multi-font i18n system covering 4 Indian languages
- `useColors()` pattern used consistently except Dashboard
- Notification channel setup with correct Expo 52 workaround
- `expo-router` file-based routing with clean onboarding gate

---

## Recommended Next Actions

1. **Replace hardcoded colors in Dashboard** (`app/(tabs)/index.tsx`) with `useColors()` tokens
2. **Cap `bleLog` array** at last 200 entries in DeviceContext to prevent memory growth
3. **Use timestamp-based event IDs** instead of module-level counters in both BLEService and SimulationService
4. **Add TypeScript type for `AppSettings`** export — it's defined in DeviceContext but not re-exported cleanly
5. Wire `EVENT_LABELS` to the i18n system or remove the map (EventRow already uses `t()` directly)

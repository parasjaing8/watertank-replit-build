# WaterTank — Project Status
_Last updated: 2026-05-23_

## App Version
`1.0.0` (package.json) | Latest APK: `watertank-v18-release.apk` (pending)

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
- `TANK_WINDOW = { black: {CX:78,CY:30,CW:175,CH:261}, blue: {CX:70,CY:28,CW:177,CH:258} }`
- Both PNGs: 1024×1536, tank body at (120,242)-(838,107x)
- Container: 300×346, `overflow:hidden`. SVG absoluteFill behind PNG Image.

## Open Issues (from auditp1.md — 44 findings, deep audit 2026-05-23)
### HIGH
- B1: Animation loop restarts 40× during fill — pour effects invisible on mount
- B2: Tank-full toast fires incorrectly after disconnect+reconnect
- B8: BlePairingSheet creates 2nd BleManager, conflicts with BLEService singleton
- L1: lastKnownTank not persisted — tank widget disappears on cold start
- A1: BlePairingSheet top-level BLE import crashes web/Expo Go
- A3: @react-native-async-storage in devDependencies (must be dependencies)
- A11: No BLE permission request on Android 12+ — silent fail
- P1: 3× setState per animation tick — merge or port to reanimated
### MEDIUM
- B3 (SimulationService race), B4 (BLE sub leak), B5 (stale settings closure), B6 (BLE tank pct unclamped), B7 (motor-off notif always NONE reason)
- L3 (pull-to-refresh doesn't re-query), L4 (weekly UTC vs IST date mismatch), L5 (pumpState not reset on disconnect), L11 (light flash on dark cold start)
- P2 (wave paths not memoized), P3 (refreshKey on every BLE tick)
- A2 (BLE name detection differs), A5 (uppercase UUIDs), A6 (no settings migration), A10 (motorOn/pumpState inconsistency), A12 (silent DB fail)
- U3 (raw ISO dates in weekly stats), U6 (last-known age unknown after restart)
### LOW
- B9, B10, L2, L6–L9, L12, P4, A4, A7–A9, U1, U2, U4, U5

## Key Files — DO NOT modify with local models
- `services/BLEService.ts` — use Claude/Sonnet only
- `components/WaterTankWidget.tsx` — complex SVG animation, use Claude/Sonnet only

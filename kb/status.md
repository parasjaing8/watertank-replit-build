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
### HIGH — all resolved ✓
All 8 HIGH items fixed in previous session (A1, A3, A11, B1, B2, B8, L1, P1)

### MEDIUM — resolved ✓
B3, B4, B5, B6, B7, L3, L4, L5, L11, L12, P2, P3, A5, A12, U1, U3 all fixed 2026-05-24

### MEDIUM — all resolved ✓
A2, A6, A10, U6 fixed 2026-05-24

### LOW — resolved ✓
B9, B10, L2, L6, L7, L8, A4, A7, A8, U2, U4, U5 all fixed 2026-05-24
- A9 skipped (getTankColor is used by TankLevelBar.tsx — not unused)
- L9 skipped (notifyManualOverride wired up via U2)
- P4 skipped (50-item BLE log is already bounded; FlatList not needed)

## Key Files — DO NOT modify with local models
- `services/BLEService.ts` — use Claude/Sonnet only
- `components/WaterTankWidget.tsx` — complex SVG animation, use Claude/Sonnet only

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

## Open Issues (from audit.md)
- Dashboard (`app/(tabs)/index.tsx`): 8 hardcoded hex colors — should use `useColors()`
- DeviceContext: `bleLog` array unbounded
- SimulationService: fragile `eventIdCounter` starting at 2000

## Key Files — DO NOT modify with local models
- `services/BLEService.ts` — use Claude/Sonnet only
- `components/WaterTankWidget.tsx` — complex SVG animation, use Claude/Sonnet only

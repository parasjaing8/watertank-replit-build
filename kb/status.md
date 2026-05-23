# WaterTank — Project Status
_Last updated: 2026-05-22_

## App Version
`1.0.0` (package.json)

## Build Status
- Android release APK: `android/app/build/outputs/apk/release/app-release.apk`
- Expo SDK: ~54 | RN: 0.81.5 | React: 19

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

## Open Issues (from audit.md)
- Dashboard (`app/(tabs)/index.tsx`): 8 hardcoded hex colors — should use `useColors()`
- DeviceContext: `bleLog` array unbounded
- SimulationService: fragile `eventIdCounter` starting at 2000

## Key Files — DO NOT modify with local models
- `services/BLEService.ts` — use Claude/Sonnet only

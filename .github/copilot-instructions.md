# WaterTank — GitHub Copilot Instructions

## Project Overview
WaterTank is a React Native (Expo) app for rural Indian farmers to monitor and log water tank levels via BLE-connected ESP32 pump controllers. Target platform: **Android** (primary). iOS is secondary. Web is unsupported for BLE features.

- **App name:** WaterTank | **Package:** `com.watertank.app`
- **Expo SDK:** ~54 | **React Native:** 0.81.5 | **React:** 19
- **Package manager:** pnpm | **Build:** `expo prebuild` → `./gradlew assembleRelease`
- **Navigation:** expo-router (file-based, `app/` directory)

---

## Architecture

```
app/              expo-router screens (index → onboarding or (tabs))
app/(tabs)/       Dashboard, Records, Settings (hidden: today, history, stats)
components/       Reusable UI components
context/          DeviceContext (global state), LanguageContext
services/         BLEService, SimulationService, NotificationService
storage/          database.ts — expo-sqlite (local SQLite, Android only)
models/           Event.ts — all enums and interfaces
constants/        ble.ts, colors.ts, i18n.ts, thresholds.ts
hooks/            useColors, useAppFont
utils/            formatters.ts
```

### Key Design Patterns
- **DeviceContext** is the single source of truth for device state, settings, events, and BLE log. All screens consume it via `useDevice()`.
- **IDeviceService** interface is implemented by both `BLEService` (real hardware) and `SimulationService` (demo). `DeviceContext` swaps between them transparently.
- BLE is loaded at runtime with `require()` inside a try/catch. `bleModuleAvailable` flag gates all BLE code paths.
- SQLite is **no-op on web** — all db calls check `isWeb` guard first.

---

## Critical Field Names — NEVER Deviate

`WaterEvent` fields (SQLite schema + BLE protocol are coupled to these exact names):

```ts
id: number
epoch: number        // Unix timestamp in SECONDS (not ms)
type: EventType
tankPct: number      // 0–100
flowLpm: number
stopReason: StopReason
durationSec: number
synced: boolean
```

---

## BLE Constants (ESP32 protocol)

```ts
BLE_DEVICE_NAME = "WaterTank"
BLE_SERVICE_UUID = "4FAFC201-1FB5-459E-8FCC-C5C9C331914B"
BLE_CHAR_STATE   = "BEB5483E-..."   // pump state byte
BLE_CHAR_TANK    = "BEB5483F-..."   // tank % float
BLE_CHAR_LOG_CTRL = "BEB54840-..."  // log control
BLE_CHAR_LOG_DATA = "BEB54841-..."  // log data
BLE_CHAR_TIME_SYNC = "BEB54842-..." // time sync
```

MTU: 512 bytes. Reconnect delays: `[5000, 10000, 20000, 30000]` ms.

---

## Color Conventions

- **Blue = good/full** (`#2563EB` for full tank) — NOT danger
- **Red = danger/error** (`#EF4444`)
- **Primary accent:** cyan/teal `#0EA5E9`
- **Dark background:** deep navy `#0A1628`
- **Card surface:** `#0F2040`
- Tank level tokens: `tankEmpty`, `tankLow`, `tankMid`, `tankHigh`, `tankFull`
- All colors accessed via `useColors()` hook — never hardcode theme colors in new components

---

## i18n / Multilingual

- 4 languages: `en`, `hi`, `mr`, `kn`
- `Lang` type: `'en' | 'hi' | 'mr' | 'kn'`
- Access translations via `useLanguage()` → `t('key')`
- Fonts by language: Inter (en), NotoSansDevanagari (hi/mr), NotoSansKannada (kn)
- All user-visible strings must use `t()` — no hardcoded English UI text
- Locale for `Intl` formatting: `en-IN`, `hi-IN`, `mr-IN`, `kn-IN`

---

## Thresholds

```ts
TANK_FULL_PCT = 95
TANK_LOW_PCT = 15
TANK_WARN_BLINK_PCT = 98
FLOW_ZERO_TIMEOUT_MS = 3000
STARTUP_DELAY_MS = 45000
SENSOR_POLL_MS = 2000
DATA_RETENTION_DEFAULT_DAYS = 60
```

---

## Notifications

- Android channel: `"motor"` with HIGH importance
- Triggered on: motor on, motor off, manual override
- User can disable each independently via `AppSettings`
- Uses `expo-notifications`, `trigger: null` (immediate) to avoid Expo 52 future-schedule bug

---

## Settings Persistence

- `AppSettings` stored in AsyncStorage at key `@watertank_settings`
- Onboarding completion stored at key `onboarding_done` (`'1'` = done)
- `simMode` is intentionally NOT persisted — always starts idle

---

## Build & Release

```bash
# Type check
pnpm typecheck

# Development
pnpm start

# Android release APK
cd android && ./gradlew assembleRelease
# APK output: android/app/build/outputs/apk/release/app-release.apk

# Full build script
pnpm build:release   # builds + copies APK to ../../watertank-replit-release.apk
```

**Never use `eas build`.** Always `expo prebuild` + `gradlew assembleRelease`.

---

## DO NOT Modify

- `services/BLEService.ts` — complex BLE state machine, only modify with Claude/Sonnet, not local models
- SQLite schema column names (coupled to BLE protocol)
- `WaterEvent` field names

---

## Code Conventions

- TypeScript strict mode (`tsconfig.json`)
- Path alias: `@/` → project root
- Functional components only, no class components
- `useColorScheme()` + `useColors()` for all theming
- `expo-router` `router.replace()` / `<Redirect>` for navigation (no manual stack manipulation)
- AsyncStorage errors silently caught with empty `catch {}` — intentional (device storage unreliable)
- SQLite errors always logged via `console.error` before swallowing
- Times always in **Unix epoch seconds** in the data model; multiply by 1000 for `new Date()`

---

## Event Types Reference

```ts
enum EventType {
  WATER_ARRIVED = 0,
  MOTOR_ON = 1,
  MOTOR_OFF = 2,
  ALREADY_FULL = 3,
  MANUAL_ON = 4,
  MANUAL_OFF = 5,
  BLE_SYNCED = 6,   // hidden from UI — internal only
}

enum StopReason {
  NONE = 0,
  TANK_FULL = 1,
  SUPPLY_CUT = 2,
  ALREADY_FULL = 3,
}
```

`BLE_SYNCED` events are always filtered from user-visible lists.

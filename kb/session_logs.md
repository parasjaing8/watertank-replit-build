# WaterTank — Session Logs

## 2026-05-24 — Fix MEDIUM priority findings

### Fixes applied (17 findings across 8 files)
- **B3** (SimulationService.ts): `_explicitlyStopped` flag prevents onComplete firing when stop() races with stepComplete
- **B4** (BLEService.ts): requestLogStream error branch now removes sub from subscriptions array (was leaking)
- **B5** (DeviceContext.tsx): updateSettings uses settingsRef to avoid stale closure on rapid taps
- **B6** (BLEService.ts): tank pct clamped to [0,100] in both char monitors (was emitting NaN/out-of-range)
- **B7** (DeviceContext.tsx): motor-off notification passes actual lastStopReason tracked from events (not hardcoded 0)
- **L3** (records.tsx): pull-to-refresh calls refreshData() from context (was just remounting FlatList with stale data)
- **L4** (records.tsx): week boundary uses local date string not UTC toISOString (was off by 1 day for IST users)
- **L5** (BLEService.ts): stop() resets pumpState+motorOn to 0/false (was showing "Motor Running" after disconnect)
- **L11** (ThemeContext.tsx): default to 'dark' — eliminates white flash on dark-mode cold start
- **L12** (DeviceContext.tsx): onComplete and stopSimulation pass settingsRef.current.retentionDays (was using default)
- **P2** (WaterTankWidget.tsx): wave paths wrapped in useMemo
- **P3** (DeviceContext.tsx): refreshKey only increments on lastSyncAt change + new events (not every 2s BLE tick)
- **A5** (constants/ble.ts): UUIDs lowercased (react-native-ble-plx Android UUID matching)
- **A12** (DeviceContext.tsx): DB init failure shows Alert instead of silent console.error
- **U1** (index.tsx + DeviceContext.tsx): DEMO badge is tappable, calls stopSimulation()
- **U3** (records.tsx): weekly stats day labels use formatDayLabel() — localized, shows "Today"/"Yesterday"
- **Local model test** (records.tsx L3/L4/U3): llama-server Qwen3.6-35B-A3B gave correct diff in 0.78s — passed

### New context APIs
- `stopSimulation()` — stop demo early, restarts BLE with saved retentionDays
- `refreshData()` — manually increment refreshKey (used by pull-to-refresh)
- `settingsRef` — stable ref tracking latest settings for use in callbacks
- `lastStopReasonRef` — tracks stop reason from events for accurate notifications

### Files changed
8 files: `services/BLEService.ts`, `services/SimulationService.ts`, `context/DeviceContext.tsx`, `context/ThemeContext.tsx`, `components/WaterTankWidget.tsx`, `constants/ble.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/records.tsx`

## 2026-05-24 — Local model setup + routing rules

### What was done
- Read M1 Max LLM benchmark data from `~/dev/tools/llm-tests/llm_tests_M1_max.md`
- Extracted task routing table, speed ladder, API patterns, aider command patterns
- Read `watertank/LESSONS.md` (original firmware project) for local model failure modes
- Created `kb/local_models.md` — consolidated benchmark data + routing + lessons for this project
- Created `CLAUDE.md` (project root) — model routing rules, build protocol, key invariants
- Added `local_model_routing.md` to project memory

### Local model status
- llama-server (port 8080): DOWN at session start — needs `! llama-server ...` to start
- Ollama (port 11434): DOWN at session start
- Both need to be started manually before local model tasks

### Key routing decisions
- BLEService.ts + WaterTankWidget.tsx → Claude only (no local models)
- 1-2 file isolated tasks → llama-server port 8080, no-think mode
- 3+ files / architectural → Claude Sonnet/Opus

### Files changed
`kb/local_models.md` (created), `CLAUDE.md` (created)

## 2026-05-24 — Fix HIGH priority findings from auditp1.md

### Execution model
- Orchestrator: Claude (Opus agents for critical fixes)
- Local runner: qwen2.5-coder:1.5b via llama-cli (1GB GGUF blob)
- Note: llama-cli cold-load on first run takes >120s on M1 Max for the 1.5b blob; applied A3 via orchestrator fallback

### Fixes applied
- **A3** (package.json): Moved `@react-native-async-storage/async-storage` from devDependencies → dependencies. Runner: qwen2.5-coder:1.5b (llama-cli) validated concept; orchestrator applied via fallback due to cold-load timeout.
- **A1** (BlePairingSheet.tsx): Removed top-level `import { BleManager, Device } from 'react-native-ble-plx'`. Now dynamically resolves via `getBleManager()` from BLEService. Won't crash web/Expo Go.
- **B8** (BLEService.ts + BlePairingSheet.tsx): Exported `getBleManager` from BLEService. BlePairingSheet now reuses the singleton instead of creating a second BleManager. `manager.destroy()` removed (would kill shared singleton).
- **B1** (WaterTankWidget.tsx): `fillPctRef` introduced; animation loop no longer has `fillPct` as a dependency. Loop no longer restarts 40× during fill animation. Pour/splash effects now visible from mount.
- **P1** (WaterTankWidget.tsx): `wavePhase` and `pourFlicker` merged into single `animState` object — one `setAnimState` call per tick instead of two.
- **B2** (index.tsx): Added `useEffect` that resets `prevPumpStateRef.current = 0` on disconnect. Prevents stale 3→0 pump transition triggering false "Tank full!" toast after reconnect.
- **L1** (index.tsx): `lastKnownTank` now persisted to AsyncStorage (`@watertank_last_known`). Loaded on mount. Tank widget survives offline app restarts.
- **A11** (_layout.tsx): `requestBlePermissions()` added — requests `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` on Android 12+ (API ≥ 31) before BLE scan starts.

### Files changed
`package.json`, `services/BLEService.ts`, `components/BlePairingSheet.tsx`, `components/WaterTankWidget.tsx`, `app/(tabs)/index.tsx`, `app/_layout.tsx`

## 2026-05-23 — Full Codebase Audit P1 (post-v18)

- Comprehensive deep audit of entire source tree after Copilot + Replit changes
- 44 findings logged in `auditp1.md`
- Categories: 10 bugs, 12 logic gaps, 4 performance, 12 architecture, 6 UX
- Top critical: animation loop restart during fill (B1), AsyncStorage in devDeps (A3), no BLE permission request Android 12+ (A11), BlePairingSheet double-BleManager (B8), lastKnownTank not persisted (L1)
- No code changes made — audit only


## 2026-05-22
- Audited full codebase (app/, components/, context/, services/, storage/, constants/, models/, utils/)
- Created `.github/copilot-instructions.md` with complete project context for Copilot
- Created `kb/` folder: `audit.md` (full code audit), `status.md` (project state)
- Key findings: Dashboard hardcodes colors, bleLog unbounded, SimulationService counter fragile
- No code changes made — audit only

## 2026-05-23 — v14–v18: PNG overlay + tank color selector

### What was built
- **v14**: Added PNG overlay technique to `WaterTankWidget.tsx` — react-native-svg water animation behind PNG tank image with `overflow:hidden` container
- **v15**: Added tank color selector (black/blue) in Settings; `AppSettings.tankColor: 'black' | 'blue'`; `TANK_IMAGES` map with both PNGs; i18n keys added (en/hi/mr/kn)
- **v16**: Normalized `assets/images/blue-tank.png` — cropped/scaled to match black tank bounds `(120,242)-(838,1071)` in 1024×1536 canvas
- **v17**: Rebuild attempt — BUG: APK still contained old blue PNG due to Gradle cache
- **v18**: Deep audit found both root causes, fixed both, clean rebuild

### Root Cause A — Gradle/Metro cache (primary)
`createBundleReleaseJsAndAssets` task was UP-TO-DATE from v15 build. v16 and v17 rebuilds reused stale Metro bundle containing the original un-normalized `blue-tank.png` (body at `(51,211)-(921,1368)`). The fixed PNG sat in `assets/images/` but was never re-bundled.
**Fix: `cd android && ./gradlew clean` before every release build when images change.**
**Verification: `unzip -p app.apk res/Yu.png | python3 -c "import sys,PIL.Image; img=PIL.Image.open(sys.stdin.buffer); print(img.getbbox())"` — check bounds match `(120,242)-(838,1071)`**

### Root Cause B — SVG clip rect hardcoded for black tank (secondary)
Blue tank window sits at image coords `x=287-711, y=308-926` → container `(70,28,177,258)`. Code used black tank's rect `(78,30,175,261)` — 8px left offset misalignment caused dark gap inside window edge.
**Fix: `TANK_WINDOW = { black: {CX:78,CY:30,CW:175,CH:261}, blue: {CX:70,CY:28,CW:177,CH:258} }` in `WaterTankWidget.tsx`**

### PNG overlay technique — layout math
- Container: `300×346` with `overflow:hidden`
- Tank PNG: `1024×1536`. Body at `(120,242)-(839,1072)` (719×830px)
- `IMG_SCALE = 300/719 = 0.4172` → `IMG_W=427, IMG_H=641, IMG_OX=-50, IMG_OY=-101`
- SVG `absoluteFill` behind the Image; `ClipPath` rect = tank window in container coords
- `POUR_Y = Math.round((430-242) * IMG_SCALE)` ≈ 78 (same for both tank colors)

### How to measure tank window bounds (Python)
```python
from PIL import Image
import numpy as np

img = np.array(Image.open("blue-tank.png").convert("RGBA"))
alpha = img[:,:,3]
# Find transparent (window) pixels per row
for y in range(img.shape[0]):
    xs = np.where(alpha[y] < 10)[0]
    if len(xs) > 50:  # ignore edges
        print(y, xs[0], xs[-1])
# Use median of stable rows to get window bounds
```
Then convert to container coords: `CX = round((window_x - 120) * IMG_SCALE)` etc.

### Files changed
- `components/WaterTankWidget.tsx` — per-color TANK_WINDOW, helper fn signatures updated
- `context/DeviceContext.tsx` — tankColor field in AppSettings
- `constants/i18n.ts` — tankColor translation keys
- `app/(tabs)/settings.tsx` — Tank Color pill selector
- `app/(tabs)/index.tsx` — passes tankColor prop to WaterTankWidget
- `assets/images/blue-tank.png` — normalized to 1024×1536 matching black tank canvas

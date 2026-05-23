# WaterTank — Session Logs

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

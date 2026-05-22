# WaterTank v4 Tasks
Generated: 2026-05-22
Status: 7/7 done

## Verification checklist
- [ ] Bottom bar shows exactly 3 tabs with icons
- [ ] WaterTankWidget looks like a real Indian plastic tank (rings, dome, wave)
- [ ] Demo button accessible from Dashboard when disconnected
- [ ] Onboarding has swipe navigation + hardware setup page
- [ ] Main tabs swipeable left/right

---

## TASK-063: [DONE] Remove junk phantom-tab directory under (tabs)

**Files:** scripts/remove-phantom-tab-dir.sh
**Model:** local
**Message:**
The Expo Router bottom bar is showing a broken 4th tab. The root cause is a junk directory whose name literally contains backticks and spaces, sitting inside `app/(tabs)/`:

```
app/(tabs)/_layout.tsx` `app/
app/(tabs)/_layout.tsx` `app/(tabs)/
app/(tabs)/_layout.tsx` `app/(tabs)/today.tsx` `app/
app/(tabs)/_layout.tsx` `app/(tabs)/today.tsx` `app/(tabs)/
```

Expo Router interprets that top-level junk directory as a route segment, which is what produces the phantom 4th tab.

Create a shell script at `scripts/remove-phantom-tab-dir.sh` that:

1. Has `#!/usr/bin/env bash` and `set -euo pipefail` at the top.
2. Changes into the repo root via `cd "$(dirname "$0")/.."`.
3. Uses `rm -rf` with the exact (single-quoted) path:
   `rm -rf 'app/(tabs)/_layout.tsx` `app'`
   IMPORTANT: the directory name literally contains the substring "_layout.tsx` `app". Quote correctly so the shell doesn't interpret the backticks. Use single quotes around the whole path argument, and inside the single quotes the backticks are literal.
4. Echos "Removed phantom-tab directory" on success.
5. Echos "Nothing to remove (already clean)" if the directory does not exist (test with `[ -d ... ]` first).

Do NOT touch any `.tsx` files. Do NOT modify `app/(tabs)/_layout.tsx`. Only create this one shell script. The script will be run manually after this task by Sonnet.
---END-MESSAGE---

## TASK-064: [DONE] Groww-style bottom tab bar — height, border, no shadow

**Files:** app/(tabs)/_layout.tsx
**Model:** local
**Message:**
Update the bottom tab bar styling in `app/(tabs)/_layout.tsx` to a Groww-style flat bar. Icons are already wired up (Feather droplet / list / settings) — do NOT change icon names or tab order. Only update the `tabBarStyle`, add `tabBarLabelStyle` tweaks, and ensure no Android elevation shadow.

Replace the existing `tabBarStyle` block with:

```ts
tabBarStyle: {
  position: 'absolute',
  backgroundColor: colors.card,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: colors.border,
  elevation: 0,
  shadowOpacity: 0,
  height: 60 + (Platform.OS === 'ios' ? 0 : 0),
  paddingBottom: 8,
  paddingTop: 6,
  ...(Platform.OS === 'web' ? { height: 84 } : {}),
},
```

Also update `tabBarLabelStyle` to:

```ts
tabBarLabelStyle: {
  fontSize: 11,
  fontFamily: 'Inter_500Medium',
  marginBottom: 4,
},
```

Keep the existing `tabBarBackground` BlurView for iOS — but on iOS keep `backgroundColor: 'transparent'`. To handle that, change `backgroundColor` to:
`backgroundColor: isIOS ? 'transparent' : colors.card,`

Do NOT remove the three hidden routes (`today`, `history`, `stats`) — they are intentional `href: null` placeholders. Leave them as-is.

Do NOT modify anything outside the `screenOptions` object and its nested style objects. The active/inactive tint colors (`colors.primary` / `colors.mutedForeground`) are already correct — leave them.
---END-MESSAGE---

## TASK-065: [DONE] Redesign WaterTankWidget as Indian plastic storage tank (SVG)

**Files:** components/WaterTankWidget.tsx
**Model:** sonnet
**Message:**
Full SVG redesign of `components/WaterTankWidget.tsx`. Reference: a Sintex-brand black plastic Indian rooftop water tank — cylindrical body taller than wide (~1.3:1), 4–5 horizontal ridge rings around the body, slightly-domed lid with a small circular handle knob in the center, wavy water surface inside.

Requirements:

1. **Size:** SVG width 200, height 260. Tank body: width ~170, body height ~190 (centered horizontally). Dome on top (~25–30 high). Small base shadow ellipse at bottom.

2. **Tank body:** dark outline using `#0F172A` (or `colors.foreground` if dark theme — but stick with #0F172A for consistency since it must look like a black plastic tank). Stroke width 3. Interior fill: white (`#FFFFFF`) in light theme, `colors.card` otherwise — use `colors.card` for safety.

3. **Rings:** 4 horizontal ribbed bands across the body. Each ring is a thin horizontal `Rect` (or two parallel `Line`s) drawn ABOVE the water fill (so they remain visible through the water). Color: `#0F172A` at 60% opacity. Space them evenly between ~25% and ~85% of body height.

4. **Dome:** Use a `Path` for the rounded top — an arc from top-left of body to top-right, bulging up by ~25px. Same outline color as body. Fill: same dark `#0F172A` (the lid is solid black on real tanks).

5. **Handle knob:** A small `Circle` (r=6) centered horizontally on top of the dome peak, filled `#0F172A`.

6. **Water:** Fills from bottom up. Use `react-native-reanimated` with `useSharedValue` and `useAnimatedProps` to animate the fill level smoothly (600ms timing) — same pattern as the existing file.

7. **Wavy water surface:** Use an `AnimatedPath` (wrap `Path` from `react-native-svg` with `Animated.createAnimatedComponent`). The `d` attribute is computed by an `useAnimatedProps` block. Build a sinusoidal wave path manually: sample x from 0 to body-width in steps of ~10px, compute y = waterY + sin(x * 0.05) * 4 (amplitude 4px). Then close the path down to the bottom-left, across to bottom-right, and back up. Animate the waterY based on the shared value. (Wave does not need to scroll — a static sinusoid at the surface is fine.)

8. **Water color:** Use `getTankColor(clamped, colors)` from `@/utils/formatters` — keep this import. Apply a vertical `LinearGradient` (95% opacity top → 65% bottom) like the current file.

9. **Disconnected state:** If `!connected`, render the tank outline + rings + dome + knob in muted colors (`colors.muted` interior, `colors.border` stroke), no water, and show a small `"No data"` `<Text>` BELOW the SVG. Do NOT render any percentage text.

10. **CRITICAL — Remove the bigPct text entirely.** The current file renders `<Text style={styles.bigPct}>{formatTankPct(clamped)}</Text>` below the SVG. DELETE this. The percentage is shown elsewhere on the Dashboard. The connected state should render ONLY the SVG (no text below it).

11. Keep the export signature: `export function WaterTankWidget({ pct, connected, animated = true }: WaterTankWidgetProps)`. Keep the `WaterTankWidgetProps` interface unchanged.

12. Imports: `react-native-svg` should now include `Path` and `Circle`. Use `Animated.createAnimatedComponent(Path)` for the wavy surface.

13. Do NOT modify `WaterEvent` types, `DeviceContext`, or any other file. This task touches one file only.

14. Test mentally: with `pct=0` you should see an empty tank with rings and dome visible. With `pct=50` the water should fill the lower half with a wavy top. With `pct=95` it should be almost full.
---END-MESSAGE---

## TASK-066: [DONE] Add "Try Demo" button to Dashboard disconnected state

**Files:** app/(tabs)/index.tsx
**Model:** local
**Message:**
On the Dashboard (`app/(tabs)/index.tsx`), when the device is disconnected AND `simMode` is false, add a "Try Demo" button inside the existing `disconnectedCard` View. This calls `runSimulation()` from `useDevice()`.

Steps:

1. In the destructure of `useDevice()` at the top of the component, add `runSimulation`:
   ```ts
   const { deviceState, simMode, runSimulation } = useDevice();
   ```

2. Inside the existing `{!deviceState.connected && (...)}` block, after the `<PulsingDots>` and the `disconnectedHint` text but BEFORE the closing fragment `</>`, add a `TouchableOpacity` button. Only render it when `!simMode`:

   ```tsx
   <TouchableOpacity
     onPress={runSimulation}
     style={[styles.demoBtn, { backgroundColor: colors.primary }]}
     activeOpacity={0.85}
   >
     <Text style={[styles.demoBtnText, { color: colors.primaryForeground }]}>
       Try Demo
     </Text>
   </TouchableOpacity>
   ```

3. Add `TouchableOpacity` to the existing `react-native` import line at the top.

4. Add two new entries to the `StyleSheet.create` block at the bottom:
   ```ts
   demoBtn: {
     marginTop: 14,
     paddingHorizontal: 22,
     paddingVertical: 11,
     borderRadius: 22,
   },
   demoBtnText: {
     fontSize: 14,
     fontFamily: "Inter_600SemiBold",
   },
   ```

5. Do NOT modify any other logic on this screen. Do NOT change i18n strings — use the literal string `"Try Demo"` for now (translation can come later).

6. Do NOT modify `DeviceContext` or `BLEService` or any other file.
---END-MESSAGE---

## TASK-067: [DONE] Onboarding swipe navigation via pagingEnabled ScrollView

**Files:** app/onboarding.tsx
**Model:** local
**Message:**
Convert the existing onboarding in `app/onboarding.tsx` from `useState(page)` + conditional rendering to a horizontal `ScrollView` with `pagingEnabled` so the user can swipe left/right between pages.

Steps:

1. Keep all three existing pages (language picker, ob1, ob2) and the existing footer (dots + CTA button). Do NOT change page contents.

2. Replace the conditional rendering (`{page === 0 && ...}`, `{page === 1 && ...}`, `{page === 2 && ...}`) with a single horizontal `ScrollView`:

   ```tsx
   <ScrollView
     ref={scrollRef}
     horizontal
     pagingEnabled
     showsHorizontalScrollIndicator={false}
     onMomentumScrollEnd={(e) => {
       const idx = Math.round(e.nativeEvent.contentOffset.x / width);
       setPage(idx);
     }}
     style={{ flex: 1 }}
   >
     <View style={{ width, ...styles.pageWrapper }}>{/* page 0 content */}</View>
     <View style={{ width, ...styles.pageWrapper }}>{/* page 1 content */}</View>
     <View style={{ width, ...styles.pageWrapper }}>{/* page 2 content */}</View>
   </ScrollView>
   ```

3. Import `Dimensions` from `react-native` and add `const { width } = Dimensions.get('window');` at the top of the file (above the component).

4. Import `useRef` and add `const scrollRef = useRef<ScrollView>(null);` inside the component.

5. The `next()` function should now scroll programmatically:
   ```ts
   function next() {
     if (page < 2) {
       scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
     } else {
       finish();
     }
   }
   ```

6. Add a new style `pageWrapper`:
   ```ts
   pageWrapper: {
     paddingHorizontal: 24,
     justifyContent: 'center',
     alignItems: 'center',
   },
   ```

7. Remove `paddingHorizontal: 24` from the `container` style (it now lives in `pageWrapper`).

8. The dots indicator and CTA button stay in the bottom `footer` View, outside the ScrollView. They already react to `page` state — that still works because `onMomentumScrollEnd` updates `page`.

9. Wrap the ScrollView inside a `View style={styles.body}` so the existing flex layout still works. Do NOT change the footer.

10. Do NOT add any new pages here — page count is still 3. The new "hardware setup" page is added in a separate task (TASK-068).

11. Add `import { ScrollView, Dimensions } from 'react-native';` (merge into existing react-native import line).
---END-MESSAGE---

## TASK-068: [DONE] Onboarding hardware setup page + BLE scan sub-flow

**Files:** app/onboarding.tsx, components/BlePairingSheet.tsx
**Model:** sonnet
**Message:**
Add a 4th onboarding page (between the existing "ob2" page and finishing) that prompts the user to set up the hardware via BLE, with an option to skip.

This task assumes TASK-067 already converted onboarding to a horizontal `ScrollView` with `pagingEnabled`. Add page index 3.

### A) `app/onboarding.tsx` changes

1. Increase total page count from 3 to 4. Update:
   - `page === 2 ? t('getStarted') : t('next')` should become `page === 3 ? t('getStarted') : t('next')`.
   - The `next()` function range check should become `page < 3`.
   - The dots indicator should map `[0, 1, 2, 3]`.
   - The `Math.round` page calculation in `onMomentumScrollEnd` still works (no change needed).

2. Add page 3 content inside a 4th `<View style={{ width, ...styles.pageWrapper }}>` block:

   ```tsx
   <View style={{ width, ...styles.pageWrapper }}>
     <Text style={styles.bigIcon}>📡</Text>
     <Text style={[styles.title, { color: colors.foreground }]}>Set up your device</Text>
     <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
       Pair your WaterTank hardware over Bluetooth, or skip for now and try the demo.
     </Text>
     <View style={{ gap: 12, marginTop: 24, width: '100%' }}>
       {bleAvailable && (
         <TouchableOpacity
           onPress={() => setShowPairing(true)}
           style={[styles.cta, { backgroundColor: colors.primary }]}
           activeOpacity={0.85}
         >
           <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Set up now</Text>
         </TouchableOpacity>
       )}
       <TouchableOpacity
         onPress={finish}
         style={[styles.cta, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border }]}
         activeOpacity={0.85}
       >
         <Text style={[styles.ctaText, { color: colors.foreground }]}>
           {bleAvailable ? 'Skip for now / Try demo' : 'Continue / Try demo'}
         </Text>
       </TouchableOpacity>
     </View>
   </View>
   ```

3. Inside the component, add:
   ```ts
   const { bleAvailable } = useDevice();
   const [showPairing, setShowPairing] = useState(false);
   ```
   Import `useDevice` from `@/context/DeviceContext`.

4. On the new 4th page, the bottom "Next / Get Started" CTA in the existing footer is redundant. Keep it, but rename its label on page 3 to "Skip" so the footer button also dismisses. Update the CTA label logic:
   ```ts
   page === 3 ? 'Skip' : (page === 2 ? t('next') : t('next'))
   ```
   Simpler: replace the existing CTA text expression entirely with:
   ```tsx
   {page === 3 ? 'Skip' : t('next')}
   ```
   And update `next()` so when `page === 3` it calls `finish()` (same effect as the page-3 skip button).

5. Render the pairing sheet as a modal overlay at the end of the root View, AFTER the footer:
   ```tsx
   {showPairing && (
     <BlePairingSheet
       onClose={() => setShowPairing(false)}
       onSuccess={() => { setShowPairing(false); finish(); }}
     />
   )}
   ```
   Import: `import { BlePairingSheet } from '@/components/BlePairingSheet';`

### B) New file `components/BlePairingSheet.tsx`

Create a simple bottom-sheet-style modal that performs a BLE scan and lists devices with "WATERTANK" in the name.

CRITICAL: Do NOT import or modify `services/BLEService.ts`. Use `react-native-ble-plx` directly for the scan in this component only.

Skeleton:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { useColors } from '@/hooks/useColors';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function BlePairingSheet({ onClose, onSuccess }: Props) {
  const colors = useColors();
  const [scanning, setScanning] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef<BleManager | null>(null);

  useEffect(() => {
    let manager: BleManager;
    try {
      manager = new BleManager();
      managerRef.current = manager;
    } catch (e) {
      setError('Bluetooth not available');
      setScanning(false);
      return;
    }
    const found = new Map<string, Device>();
    manager.startDeviceScan(null, { allowDuplicates: false }, (err, device) => {
      if (err) {
        setError(err.message);
        setScanning(false);
        return;
      }
      if (device && device.name && device.name.toUpperCase().includes('WATERTANK')) {
        found.set(device.id, device);
        setDevices(Array.from(found.values()));
      }
    });
    const timer = setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
    }, 10000);
    return () => {
      clearTimeout(timer);
      try { manager.stopDeviceScan(); } catch {}
      try { manager.destroy(); } catch {}
    };
  }, []);

  async function connect(device: Device) {
    try {
      managerRef.current?.stopDeviceScan();
      await device.connect();
      onSuccess();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>Pair your device</Text>
          {scanning && (
            <View style={styles.scanRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.scanText, { color: colors.mutedForeground }]}>Scanning…</Text>
            </View>
          )}
          {error && (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          )}
          {!scanning && devices.length === 0 && !error && (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No WATERTANK devices found. Make sure your device is powered on and nearby.
            </Text>
          )}
          {devices.map((d) => (
            <TouchableOpacity
              key={d.id}
              onPress={() => connect(d)}
              style={[styles.deviceRow, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.deviceName, { color: colors.foreground }]}>{d.name}</Text>
              <Text style={[styles.deviceId, { color: colors.mutedForeground }]}>{d.id}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: 24,
    paddingBottom: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
  },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  scanText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  empty: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, marginTop: 4 },
  deviceRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    gap: 4,
  },
  deviceName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  deviceId: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  cancelBtn: { alignSelf: 'center', paddingVertical: 12, marginTop: 8 },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
```

Do NOT modify `services/BLEService.ts`. Do NOT modify `context/DeviceContext.tsx`. The successful pairing here just finishes onboarding — `DeviceContext` will pick up the device on its own via the existing BLEService auto-scan loop.

If `bleModuleAvailable` is false (i.e. running in Expo Go), the new `BleManager()` constructor will throw — the catch block sets `error` and the user can still hit "Cancel" / Skip.
---END-MESSAGE---

## TASK-069: [DONE] Swipe-between-tabs gesture on Dashboard, Records, Settings

**Files:** components/TabSwipeWrapper.tsx, app/(tabs)/index.tsx, app/(tabs)/records.tsx, app/(tabs)/settings.tsx
**Model:** ollama-27b
**Message:**
Add horizontal swipe gestures to the three main tab screens so users can swipe left/right to switch tabs. Tab order: Dashboard(0) ↔ Records(1) ↔ Settings(2).

### A) New file `components/TabSwipeWrapper.tsx`

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';

const TAB_ROUTES = ['/(tabs)', '/(tabs)/records', '/(tabs)/settings'] as const;

interface Props {
  index: 0 | 1 | 2;
  children: React.ReactNode;
}

function navigate(idx: number) {
  const route = TAB_ROUTES[idx];
  if (route) router.replace(route as any);
}

export function TabSwipeWrapper({ index, children }: Props) {
  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      const dx = e.translationX;
      const vx = e.velocityX;
      const goLeft = dx < -80 || vx < -400;
      const goRight = dx > 80 || vx > 400;
      if (goLeft && index < 2) runOnJS(navigate)(index + 1);
      else if (goRight && index > 0) runOnJS(navigate)(index - 1);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
```

### B) Wrap each tab screen

In each of the three tab screens, wrap the existing top-level returned JSX in `<TabSwipeWrapper index={N}>...</TabSwipeWrapper>`:

- `app/(tabs)/index.tsx` → `index={0}`. The existing root is `<View style={{ flex: 1, backgroundColor: colors.background }}>`. Replace the outer `<View>` with `<TabSwipeWrapper index={0}><View style={{ flex: 1, backgroundColor: colors.background }}>...</View></TabSwipeWrapper>`. Add the import.
- `app/(tabs)/records.tsx` → `index={1}`. Outer is `<View style={[styles.container, { backgroundColor: colors.background }]}>`. Wrap the same way.
- `app/(tabs)/settings.tsx` → `index={2}`. Outer is `<ScrollView ...>`. Wrap by putting `<TabSwipeWrapper index={2}>` around it — but since GestureDetector needs a View child and ScrollView consumes vertical pan, the wrapper's `failOffsetY` is what prevents conflict. This should work because we declare horizontal-only via `activeOffsetX`/`failOffsetY`.

For each tab screen, add the import:
```ts
import { TabSwipeWrapper } from '@/components/TabSwipeWrapper';
```

Do NOT modify the internal logic of any tab screen — only wrap the outer JSX and add the import. Do NOT modify `app/(tabs)/_layout.tsx`. Do NOT modify `BLEService.ts` or `DeviceContext.tsx`.

Notes:
- `react-native-gesture-handler` is already installed (~2.20.2).
- `react-native-reanimated` is already installed (~3.16.7) and `runOnJS` is the correct way to call `router.replace` from the gesture worklet thread.
- Expo Router's `router.replace` with a tab route segment will switch tabs without re-mounting the root layout.
---END-MESSAGE---

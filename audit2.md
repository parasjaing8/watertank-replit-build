# WaterTank v2 — User Experience Audit

> Auditor perspective: rural India farmer, no formal education, 40–60 years old, reads Hindi/Marathi/Kannada, casual Android user.
> Compared against v1 audit (4/10).

---

## v1 Fixes Verification

| # | Fix | Status | Evidence |
|---|-----|--------|----------|
| 1 | 5 tabs → 3 tabs | ✅ Fixed | `_layout.tsx`: only index, records, settings exposed. today/history/stats via `href: null` |
| 2 | Battery bar → cylindrical SVG tank | ✅ Fixed | `WaterTankWidget.tsx`: 140×220 SVG rect with rim ellipse, gradient fill, water-surface ellipse |
| 3 | "Air Purge" → "Motor starting…" | ⚠️ Partial | Dashboard uses `t('motorStarting')` ✓ — but `models/Event.ts:64` still has `PUMP_STATE_LABELS[2] = "Air Purge (45s)"` |
| 4 | "Supply Detected" → "Water Arrived" | ⚠️ Partial | UI labels fixed ✓ — but `PUMP_STATE_LABELS[1] = "Supply Detected"` still in `models/Event.ts:63`. `StatusDot.tsx:48` hard-codes `"Simulating"` in English |
| 5 | "Pump State" card removed | ✅ Fixed | Dashboard has no pump-state card |
| 6 | Language picker on first launch | ✅ Fixed | `onboarding.tsx` page 3 has 4-language grid. `_layout.tsx:31-49` gates first-time users |
| 7 | DEBUG hidden behind 7-tap | ✅ Fixed | `settings.tsx:98-108` — 7 taps on version row sets `devMode=true` |
| 8 | Full-tank colour → blue | ✅ Fixed | `formatters.ts:72-81` returns `tankFull` (#2563EB blue) at ≥95% |
| 9 | 12-hour AM/PM time | ✅ Fixed | `formatters.ts:1-9` uses `hour12: true`, no seconds |
| 10 | No decimal precision on tank % | ✅ Fixed | `formatTankPct` uses `Math.round(pct)` |
| 11 | "Tank Full — Skipped" → plain English | ✅ Fixed | `i18n.ts:88` `evAlreadyFull: 'Water Arrived (tank was already full)'`, mirrored in hi/mr/kn |
| 12 | BLE_SYNCED hidden from Records | ✅ Fixed | `models/Event.ts:77` `HIDDEN_EVENT_TYPES = [EventType.BLE_SYNCED]`, `EventRow.tsx:55` returns null |
| 13 | 3-screen onboarding | ✅ Fixed | `onboarding.tsx` pages 0/1/2 with dots, Next/Get Started, language picker |

**Score: 11 fixed / 2 partial / 0 missed.**

---

## First Impression & Onboarding

A first-time user sees:
- Page 1: 💧 + "Your water tank, always watched" / "This app automatically starts and stops your motor when village water arrives."
- Page 2: ⚡ + "Works automatically, day or night" / "When Panchayat water arrives..."
- Page 3: 🌐 + "Choose your language" + 4 chips (English / हिन्दी / मराठी / ಕನ್ನಡ) + "Get Started"

**Critical problem — language picker is on page 3, not page 1.**
A 50-year-old Marathi speaker sees two full English screens before finding the language toggle. WhatsApp, Google, and every major app targeting India puts the language choice first. A rural user who can't read English may give up before reaching page 3.

**Other issues:**
- Emoji heroes (💧⚡🌐) are abstract. A real pump/tank illustration would land better for users who don't associate emoji with physical objects.
- Onboarding has no Skip button — reinstalling users must page through again.
- No preview of what the dashboard looks like. Users have zero context for what they're about to see.
- Title 26px bold ✓, subtitle 16px ✓ — good sizes, but subtitle is 2 lines of prose that rural elders won't read.

---

## Screen-by-Screen Review

### Dashboard

**What works:**
- Tank widget is dominant — correct visual hierarchy.
- Animated fill (600ms) feels alive and responsive.
- StatusDot pulses when disconnected — good ambient feedback.
- Motor card with colored dot + text is clean.
- Air purge countdown shows "Motor starting... 45s" — concrete wait time.

**Still confusing or broken:**
- `StatusDot.tsx:48` hard-codes `"Simulating"` in English — Hindi/Marathi/Kannada users see untranslated badge.
- `index.tsx:67` hard-codes `'Demo running…'` in English — same leak.
- Default state for a new user (no hardware) is just "Looking for your device..." with no guidance. No "Make sure your device is powered on" or "We'll connect automatically".
- No absolute time anywhere — user doesn't know if "Updated 5 min ago" means 7:42 AM or 2:00 PM.
- Tank shows only `%` — no litres, no buckets. Percentages are abstract for non-numerate users.
- Motor card disappears entirely when disconnected — users wonder where it went.
- `'Demo running…'` hard-coded English will appear in the middle of translated UI.

### Records

**What works:**
- Date navigator with arrow buttons — simple and discoverable.
- "Today" label is translated.
- Empty state uses translated waiting message.
- Pull-to-refresh with haptics.

**Still confusing or broken (biggest issues in the whole app):**
- **EVENT_LABELS entirely English.** `EventRow.tsx:59` reads `EVENT_LABELS[event.type]` from `models/Event.ts:44-52` — all English. The i18n.ts has perfect translations (`evMotorOn`, `evWaterArrived`, etc.) but they are never used. **Hindi users see "Motor Started", "Water Arrived" in English on the Records screen.** This is the single worst issue in v2.
- **STOP_REASON_LABELS entirely English.** `EventRow.tsx:93` chip shows "Tank Full", "Water supply ended" — always English, always. i18n keys `stopTankFull`, `stopSupplyCut` exist but are dead code.
- **Footer hard-coded English:** `records.tsx:106-109` — `'No motor runs today'`, `'Motor ran 1 time today'`, `` `Motor ran ${motorRuns} times today` ``.
- **Date header always English-India locale.** `formatHeaderDate` hard-codes `'en-IN'` — a Kannada user sees "Tuesday, 19 May 2026" not ಮಂಗಳವಾರ.
- **`formatRelativeTime` ignores i18n.** Keys `justNow`, `minuteAgo`, `hoursAgo` exist in i18n.ts but formatters.ts uses its own English strings.
- No weekly/monthly view — user wanting "how much did the motor run this week?" must manually count 7 day-pages.
- No filters or aggregation beyond daily count.

### Settings

**What works:**
- Language switcher at top with 4 chips in native scripts — correct placement.
- Notification toggles clearly labelled (translated).
- Retention chips (30d/60d/90d).
- 7-tap dev mode unlock works cleanly.
- "Share my records" and "Delete all records" correctly translated.

**Still confusing or broken:**
- **Section headers hard-coded English:** `settings.tsx:183` `"NOTIFICATIONS"`, `settings.tsx:211` `"DATA"`, `settings.tsx:331` `"ABOUT"`. Only the LANGUAGE section uses `t()`. Inconsistent.
- **Retention chips ignore i18n:** `settings.tsx:239` renders `{days}d` — but i18n.ts *has* `days30: '30 दिन'`, `days60: '60 दिन'`, etc. Dead translation.
- Language chips in Settings are `paddingVertical: 8` (~33px height) — below 44px minimum tap target.
- Retention chips are `paddingVertical: 5` (~30px) — same issue.
- No quiet hours / time-window for notifications — a 3 AM motor start buzzes the phone.
- No way to exit dev mode except app restart. A curious user who taps version 7 times is stuck with DEBUG visible.
- `devMode` is component state — resets on unmount. So it self-clears on tab switch, which is fine.

---

## Translation Quality Check

### Hindi (hi) — B+
- Natural conversational Hindi: "पानी आ गया", "मोटर चल रही है", "टंकी भरी हुई है" — correct.
- "पंचायत का पानी" — perfect, matches how villagers say it.
- **Issue:** `pumpManual: 'पंप मैनुअल पर है'` — "manual" is an anglicism rural elders won't know. Better: "पंप हाथ से चल रहा है".
- "रिकॉर्ड", "सेटिंग्स", "शेयर", "अपडेट" — acceptable anglicisms.
- "हो गया" for Done — perfect.

### Marathi (mr) — A− (best of three)
- "पाणी आले", "मोटर चालू आहे", "टाकी भरली आहे" — natural.
- "नोंदी" for records — real Marathi, much better than transliteration.
- "अ‍ॅप आवृत्ती" — correct formal Marathi for "app version".
- **Issue:** `pumpManual: 'पंप मॅन्युअल वर आहे'` — same "manual" anglicism. Better: "पंप हाताने चालू आहे".

### Kannada (kn) — B (reads bookish)
- "ನೀರು ಬಂದಿದೆ", "ಮೋಟಾರ್ ಚಾಲನೆಯಲ್ಲಿದೆ" — correct.
- **Issue:** `pumpManual: 'ಪಂಪ್ ಕೈಯಿಂದ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ'` — too formal/literal ("pump is in hand-control"). Rural Kannada: "ಪಂಪ್ ಮ್ಯಾನ್ಯುಯಲ್ ಆನ್ ಆಗಿದೆ" or "ಕೈಯಿಂದ ಆನ್ ಆಗಿದೆ".
- **Issue:** `deviceName: 'ಸಾಧನ'` — Sanskrit-derived formal word. Rural speakers say "ಮಷಿನ್" or "ಯಂತ್ರ".
- **Issue:** "ಸ್ವಯಂಚಾಲಿತವಾಗಿ" (automatically) — bookish. Spoken: "ತಾನಾಗಿಯೇ".
- "ಗ್ರಾಮದ ನೀರು" — should match others and say "ಗ್ರಾಮ ಪಂಚಾಯತಿ ನೀರು".

### Dead translations (exist in i18n.ts but never consumed)
- `evMotorOn`, `evMotorOff`, `evWaterArrived`, `evAlreadyFull`, `evManualOn`, `evManualOff` — exist, unused by EventRow
- `stopTankFull`, `stopSupplyCut`, `stopAlreadyFull` — exist, unused
- `justNow`, `minuteAgo`, `minutesAgo`, `hourAgo`, `hoursAgo` — exist, `formatRelativeTime` uses its own English strings
- `days30`, `days60`, `days90` — exist, Settings renders `{days}d` instead

---

## Remaining Jargon / Confusing Text

| String | Where | Problem |
|--------|-------|---------|
| `"Simulating"` | StatusDot.tsx:48 | English literal, untranslated |
| `'Demo running…'` | index.tsx:67 | English literal in translated UI |
| `'No motor runs today'` | records.tsx:106 | English literal |
| `"NOTIFICATIONS"` `"DATA"` `"ABOUT"` | settings.tsx:183,211,331 | English section headers |
| `{days}d` | settings.tsx:239 | English shorthand, translations ignored |
| `"Manual"` / `"मैनुअल"` / `"ಮ್ಯಾನ್ಯುಯಲ್"` | i18n.ts | Technical anglicism unknown to rural elders |
| `"Air Purge (45s)"` | models/Event.ts:64 | Still in PUMP_STATE_LABELS, will leak |
| `"Supply Detected"` | models/Event.ts:63 | Still in PUMP_STATE_LABELS, will leak |
| All EVENT_LABELS | models/Event.ts:44-52 | English only, used by EventRow |
| All STOP_REASON_LABELS | models/Event.ts:54-59 | English only, used by EventRow chip |
| `"Updated X min ago"` | StatusDot | `formatRelativeTime` English-only |
| Dates in Records header | records.tsx | `'en-IN'` hard-coded, always English |
| `"ID,Epoch,Date,Event..."` | CSV export | Technical column headers |

---

## New Issues Introduced in v2

1. **Records screen is effectively un-translated** for event names and stop reasons — translations were written in i18n.ts but EventRow never calls them. v1 had no translations at all; v2 appears translated but isn't. Worse in spirit.
2. **`formatRelativeTime` ignores its own i18n keys** — dead code in i18n.ts.
3. **Settings section headers inconsistent** — only LANGUAGE uses `t()`, others don't.
4. **`'en-IN'` locale baked into 4 formatter functions** — dates always English regardless of UI language.
5. **Tank widget uses hard-coded dark background `#0F172A`** — not from theme. In bright sunlight (outdoors) on older screens this may look like a black box.
6. **Manual override banner uses `letterSpacing: 1` all-caps** — Devanagari/Kannada conjuncts will visually break under letter-spacing.
7. **No escape from dev mode** — once 7-tap unlocks DEBUG, only app restart hides it.
8. **Inter font has no Devanagari/Kannada glyphs** — system fallback font (NotoSans-Devanagari) has different metrics than Inter; multilingual UI will have inconsistent text sizing and alignment.
9. **Language chips in Settings `paddingVertical: 8`** — below 44px tap target, harder for older fingers.
10. **`PUMP_STATE_LABELS` still contains "Air Purge" and "Supply Detected"** — partially fixed issues will resurface if any screen reads these labels.

---

## Missing Features (still absent after v2)

- **Notifications not wired** — Settings toggles save to AsyncStorage but no NotificationService exists. Toggles have no effect.
- **No manual motor control button** — users occasionally want to start the motor manually (tanker delivery, testing).
- **No litres / volume display** — tank % is abstract. "~750 litres" is concrete.
- **No tank-low warning** — `TANK_LOW_PCT = 15` defined in `thresholds.ts`, never surfaced in UI.
- **No weekly/monthly summary** — Records is per-day only.
- **No supply pattern insight** — "Water usually arrives around 6 AM" is easy to derive from the data.
- **No troubleshoot screen** when disconnected — just a pulsing dot with no action.
- **Language doesn't affect date locale** — dates always render in English-India format.
- **No "Tank Full" celebration** — when motor stops at 95%, no toast/feedback to close the loop.
- **No font-size control** — a 60-year-old can't make text bigger.
- **No PDF / WhatsApp-friendly export** — CSV is too technical for sharing with relatives or a mechanic.
- **No help / "how it works" screen** accessible post-onboarding.

---

## Accessibility & Readability (v2)

| Element | Size | Verdict |
|---------|------|---------|
| Tank % (WaterTankWidget) | 42px bold | Excellent |
| Motor label | 16px SemiBold | OK |
| StatusDot label | 13px | **Borderline — especially for Devanagari/Kannada** |
| StatusDot subtext ("Updated X ago") | 12px | **Too small** |
| Disconnected card subtitle | 12px, lineHeight 18 | **Too small in 3 scripts** |
| EventRow time | 12px | **Too small** |
| EventRow event label | 14px | Borderline |
| EventRow chip (stop reason) | 12px | **Too small** |
| EventRow duration | 12px | **Too small** |
| Settings rowLabel | 15px | OK |
| Settings sectionHeader | 11px + letter-spacing | **Too small; letter-spacing breaks conjuncts** |
| Retention chips | 13px, ~30px height | **Below 44px tap minimum** |
| Language chips (Settings) | ~33px height | **Below 44px tap minimum** |
| Tab labels | 11px | Industry-low |
| Onboarding title | 26px bold | Excellent |
| Onboarding subtitle | 16px | Good |

**Contrast:**
- Body text `#0F172A` on `#FFFFFF` — excellent.
- `mutedForeground` `#6B7F9E` on muted background `#E2ECFA` — ~3.5:1, fails WCAG AA for 12px text.
- Dark mode `#E2EDF9` on `#0A1628` — excellent.
- Dark mode mutedForeground `#6B8CAE` on `#0A1628` — passes AA, marginal AAA for small text.

**Font rendering:**
- Inter (loaded) covers Latin only. Devanagari and Kannada glyphs fall back to Android system font (NotoSansDevanagari / NotoSansKannada). Different x-height and metrics than Inter — causes **inconsistent vertical alignment** in EventRow's mixed-language rows and **size mismatches** between English labels and their translated equivalents.
- `letterSpacing` values on the manual banner and section headers will **visually break Hindi/Marathi/Kannada conjuncts** (aksharas with multiple components).

---

## Overall Rating

| | v1 | v2 |
|--|----|----|
| Rating | 4/10 | **6.5/10** |

**What pushed it up (+2.5):** Tank widget improvement, 3 tabs, onboarding with language picker, real translations for ~80% of strings, blue full-tank, 12h time, removed jargon from main flows, DEBUG hidden.

**What's holding it back:** Records screen is still English despite translations existing (single biggest UX failure of v2). Onboarding language picker is on the wrong page. Dates always in English locale. Section headers and retention chips ignore translations. Inter font doesn't cover Devanagari/Kannada. Small tap targets in Settings.

---

## Top 5 Priority Fixes for v3

### 1. Wire EVENT_LABELS and STOP_REASON_LABELS through i18n
**File:** `components/EventRow.tsx:59, 93`

The translations exist. They're just not called.

Replace:
```ts
const label = EVENT_LABELS[event.type] ?? `Event ${event.type}`;
```
With a hook call: `const { t } = useLanguage()` and map EventType → `t('evMotorOn')` etc.

Same for chip: `STOP_REASON_LABELS[event.stopReason]` → `t('stopTankFull')` / `t('stopSupplyCut')` / `t('stopAlreadyFull')`.

Also fix `records.tsx:106-109` footer strings and `settings.tsx:183,211,331` section headers.

### 2. Move language picker to onboarding page 1
**File:** `app/onboarding.tsx`

Swap page order: language picker first, then "Your water tank" explanation, then "Works automatically". Once language is selected on page 1, subsequent pages render in the chosen language. This is how WhatsApp, Google, and every India-first app does it.

Also: once the user picks a language, call `setLanguage()` immediately so page 2 renders translated.

### 3. Fix `formatRelativeTime` and date locale to use selected language
**File:** `utils/formatters.ts:48-65, 1-31, 106-113`

- Replace 4× hard-coded `'en-IN'` with a locale map: `{ en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', kn: 'kn-IN' }` — accept `lang` parameter or read from a module-level ref.
- `formatRelativeTime`: use existing i18n keys `justNow`, `minuteAgo`, `minutesAgo`, `hourAgo`, `hoursAgo` — accept a `t` function parameter.
- `formatDuration`: add translated unit suffixes via `t('secondsShort')`, `t('minutesShort')`, `t('hoursShort')` (add to i18n.ts).

### 4. Fix small tap targets and bump Records text sizes
**File:** `components/EventRow.tsx` styles, `app/(tabs)/settings.tsx` styles

- EventRow: `time` 12→14px, `label` 14→16px, `chipText` 12→14px, `duration` 12→14px.
- Settings language chips: `paddingVertical: 8` → `paddingVertical: 12`.
- Settings retention chips: `paddingVertical: 5` → `paddingVertical: 10`.

### 5. Load Devanagari + Kannada fonts, fix `pumpManual` translation, clean PUMP_STATE_LABELS
**Files:** `app/_layout.tsx`, `constants/i18n.ts`, `models/Event.ts:61-66`

- Add `@expo-google-fonts/noto-sans-devanagari` and `@expo-google-fonts/noto-sans-kannada` (or NotoSans which covers all scripts) to package.json and load alongside Inter. Use based on `lang` in a `useFontFamily()` hook.
- `i18n.ts` — fix `pumpManual`:
  - hi: `'पंप हाथ से चल रहा है'` (not "मैनुअल")
  - mr: `'पंप हाताने चालू आहे'` (not "मॅन्युअल")
  - kn: `'ಪಂಪ್ ಕೈಯಿಂದ ಆನ್ ಆಗಿದೆ'` (not "ನಿಯಂತ್ರಣದಲ್ಲಿದೆ")
- `models/Event.ts:61-66`: replace `PUMP_STATE_LABELS[1]` `"Supply Detected"` → `"Water Arrived"`, `PUMP_STATE_LABELS[2]` `"Air Purge (45s)"` → `"Motor Starting"`.

---

*Audit performed 2026-05-22. Source: watertank-replit-build commit 037276e.*

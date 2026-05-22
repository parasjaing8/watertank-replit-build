# TASKS3.md — WaterTank v3: 6.5/10 → 10/10
# Target: rural India farmers, perfect multilingual UX, production quality
#
# Models:
#   local      → Qwen3.6-35B @ http://127.0.0.1:8080/v1 (complex tasks)
#   ollama-27b → qwen3.6:27b @ ollama (simple atomic edits)
#   sonnet     → Claude Sonnet executes directly (new features, TS-critical)
#
# Run all local+ollama tasks: python3 run-tasks-v3.py
# Sonnet tasks: handled by observer loop
#
# FIELD NAMES (never deviate): event.epoch, event.tankPct, event.durationSec, event.flowLpm
# DO NOT modify: services/BLEService.ts

# RESEARCH NOTES (informs the tasks below)
# - expo-notifications v0.29 on Expo 52 has a known scheduling bug where future-scheduled
#   notifications fire immediately. WORKAROUND: use IMMEDIATE notifications (trigger: null)
#   only — we never need a future-scheduled one (we fire on state changes from RN).
# - Android 13+ requires runtime POST_NOTIFICATIONS permission via requestPermissionsAsync.
# - Android 8+ requires setNotificationChannelAsync BEFORE any notify. Channel importance HIGH for heads-up.
# - Add expo-notifications plugin to app.json with android config (icon, color, defaultChannel).
# - Add POST_NOTIFICATIONS to android.permissions.
# - Font package exports: NotoSansDevanagari_400Regular / _700Bold (covers Hindi+Marathi).
#   NotoSansKannada_400Regular / _700Bold. Use the standard expo-font useFonts() map.
# - Hermes on Android 0.70+ supports Intl.DateTimeFormat with hi-IN / mr-IN / kn-IN locales out of the box.
#   No polyfill needed. Just pass the BCP-47 tag.
# - adb workflow (for verify step): `adb devices` → `adb -s emulator-5554 install -r app-release.apk` →
#   `adb -s emulator-5554 logcat -b crash *:E ReactNativeJS:V` to capture JS errors + crashes.

---

## TASK-044: [DONE] Add missing i18n keys for v3

**Files:**
- `constants/i18n.ts`

**Model:** `ollama-27b`

**Message:**
Edit ONLY `constants/i18n.ts`. The file currently exports a `Translations` interface and a `TRANSLATIONS: Record<Lang, Translations>` object with 4 languages (en, hi, mr, kn).

Add these NEW fields to the `Translations` interface (insert before the closing `}` of the interface, after `hoursAgo: string;`):

```ts
  // section headers
  notifications: string;
  data: string;
  about: string;
  // sim mode
  simulating: string;
  demoRunning: string;
  // records footer
  noMotorRunsToday: string;
  motorRanOnce: string;
  motorRanNTimes: string;
  // relative time
  secondsAgo: string;
  hourAgoOne: string;
  // duration unit abbreviations
  sec: string;
  min: string;
  hr: string;
  // dashboard
  tankLow: string;
  tankFullCelebration: string;
  deviceConnecting: string;
  checkDevicePower: string;
  // help
  helpTitle: string;
  helpHowItWorks: string;
  helpMotorQuestion: string;
  helpMotorAnswer: string;
  helpConnectQuestion: string;
  helpConnectAnswer: string;
  helpManualQuestion: string;
  helpManualAnswer: string;
  // weekly summary
  today2: string;
  thisWeek: string;
  weeklyTitle: string;
  weeklyRuns: string;
  weeklyRuntime: string;
  weeklyNoData: string;
  // tank size
  litres: string;
  tankSizeLabel: string;
  tankSizePlaceholder: string;
  configureTankSize: string;
  // dev mode
  hideDeveloperOptions: string;
```

Then add the corresponding values inside each of the 4 language blocks (en/hi/mr/kn). Insert the new k:v pairs at the END of each block (before the closing `}`).

ALSO FIX `pumpManual` in hi/mr/kn (already present — REPLACE values only):
- `hi`: `pumpManual: 'पंप हाथ से चल रहा है'`
- `mr`: `pumpManual: 'पंप हाताने चालू आहे'`
- `kn`: `pumpManual: 'ಪಂಪ್ ಕೈಯಿಂದ ಆನ್ ಆಗಿದೆ'`

Exact values to add per language (use these strings verbatim):

**en:**
```
notifications: 'Notifications',
data: 'Data',
about: 'About',
simulating: 'Simulating',
demoRunning: 'Demo running…',
noMotorRunsToday: 'No motor runs today',
motorRanOnce: 'Motor ran 1 time today',
motorRanNTimes: 'Motor ran %n times today',
secondsAgo: 'a few seconds ago',
hourAgoOne: '1 hour ago',
sec: 's',
min: 'm',
hr: 'h',
tankLow: 'Tank is running low',
tankFullCelebration: 'Tank is full!',
deviceConnecting: "Make sure your WaterTank device is powered on. We'll connect automatically.",
checkDevicePower: 'Make sure your device has power and is within range.',
helpTitle: 'Help & FAQ',
helpHowItWorks: 'How it works',
helpMotorQuestion: 'When does the motor start?',
helpMotorAnswer: 'The motor starts automatically when village water arrives and the tank is below 95%. There is a 45-second startup delay to clear air from the pipe.',
helpConnectQuestion: "The app says 'Not connected'. What do I do?",
helpConnectAnswer: 'Make sure the WaterTank device has power and is within Bluetooth range (about 10 metres). The app will connect by itself — you do not need to press anything.',
helpManualQuestion: 'What is manual mode?',
helpManualAnswer: 'Manual mode means someone has switched the pump on by hand at the device. The app shows a red banner while this is on.',
today2: 'Today',
thisWeek: 'This Week',
weeklyTitle: 'This Week',
weeklyRuns: 'Motor runs',
weeklyRuntime: 'Total runtime',
weeklyNoData: 'No motor runs this week',
litres: 'L',
tankSizeLabel: 'Tank size',
tankSizePlaceholder: '1000',
configureTankSize: 'Set tank size to see litres',
hideDeveloperOptions: 'Hide developer options',
```

**hi:**
```
notifications: 'सूचनाएँ',
data: 'डेटा',
about: 'के बारे में',
simulating: 'डेमो चल रहा है',
demoRunning: 'डेमो चल रहा है…',
noMotorRunsToday: 'आज मोटर नहीं चली',
motorRanOnce: 'आज मोटर 1 बार चली',
motorRanNTimes: 'आज मोटर %n बार चली',
secondsAgo: 'कुछ सेकंड पहले',
hourAgoOne: '1 घंटा पहले',
sec: 'से',
min: 'मि',
hr: 'घं',
tankLow: 'टंकी में पानी कम है',
tankFullCelebration: 'टंकी भर गई!',
deviceConnecting: 'ध्यान दें कि आपका WaterTank डिवाइस चालू है। हम अपने आप जुड़ जाएँगे।',
checkDevicePower: 'देखें कि डिवाइस चालू है और पास में है।',
helpTitle: 'मदद और सवाल-जवाब',
helpHowItWorks: 'यह कैसे काम करता है',
helpMotorQuestion: 'मोटर कब शुरू होती है?',
helpMotorAnswer: 'जब गाँव का पानी आता है और टंकी 95% से कम होती है, मोटर अपने आप शुरू हो जाती है। पाइप से हवा निकालने के लिए 45 सेकंड का इंतज़ार होता है।',
helpConnectQuestion: "ऐप 'जुड़ा नहीं है' दिखा रहा है। क्या करूँ?",
helpConnectAnswer: 'देखें कि WaterTank डिवाइस चालू है और 10 मीटर के अंदर है। ऐप अपने आप जुड़ जाएगा — आपको कुछ दबाने की ज़रूरत नहीं।',
helpManualQuestion: 'मैनुअल मोड क्या है?',
helpManualAnswer: 'मैनुअल मोड का मतलब है कि किसी ने डिवाइस पर हाथ से पंप चालू किया है। जब यह चालू होता है तो ऐप लाल पट्टी दिखाता है।',
today2: 'आज',
thisWeek: 'इस हफ़्ते',
weeklyTitle: 'इस हफ़्ते',
weeklyRuns: 'मोटर कितनी बार चली',
weeklyRuntime: 'कुल समय',
weeklyNoData: 'इस हफ़्ते मोटर नहीं चली',
litres: 'ली',
tankSizeLabel: 'टंकी का आकार',
tankSizePlaceholder: '1000',
configureTankSize: 'लीटर देखने के लिए टंकी का आकार सेट करें',
hideDeveloperOptions: 'डेवलपर विकल्प छुपाएँ',
```

**mr:**
```
notifications: 'सूचना',
data: 'डेटा',
about: 'बद्दल',
simulating: 'डेमो चालू आहे',
demoRunning: 'डेमो चालू आहे…',
noMotorRunsToday: 'आज मोटर चालली नाही',
motorRanOnce: 'आज मोटर 1 वेळा चालली',
motorRanNTimes: 'आज मोटर %n वेळा चालली',
secondsAgo: 'काही सेकंदांपूर्वी',
hourAgoOne: '1 तास पूर्वी',
sec: 'से',
min: 'मि',
hr: 'ता',
tankLow: 'टाकीत पाणी कमी आहे',
tankFullCelebration: 'टाकी भरली!',
deviceConnecting: 'तुमचे WaterTank डिव्हाइस चालू असल्याची खात्री करा. आम्ही आपोआप जोडू.',
checkDevicePower: 'डिव्हाइस चालू आहे आणि जवळ आहे का ते पाहा.',
helpTitle: 'मदत आणि प्रश्न',
helpHowItWorks: 'हे कसे काम करते',
helpMotorQuestion: 'मोटर कधी सुरू होते?',
helpMotorAnswer: 'गावाचे पाणी आल्यावर आणि टाकी 95% पेक्षा कमी असल्यास मोटर आपोआप सुरू होते. पाईपातून हवा बाहेर पडण्यासाठी 45 सेकंद थांबते.',
helpConnectQuestion: "ऐप 'जोडलेले नाही' दाखवते. काय करावे?",
helpConnectAnswer: 'WaterTank डिव्हाइस चालू आहे आणि 10 मीटरच्या आत आहे का ते पाहा. ऐप आपोआप जोडेल — तुम्हाला काही दाबायची गरज नाही.',
helpManualQuestion: 'मॅन्युअल मोड म्हणजे काय?',
helpManualAnswer: 'मॅन्युअल मोड म्हणजे कोणीतरी डिव्हाइसवर हाताने पंप सुरू केला आहे. हे चालू असताना ऐप लाल पट्टी दाखवते.',
today2: 'आज',
thisWeek: 'या आठवड्यात',
weeklyTitle: 'या आठवड्यात',
weeklyRuns: 'मोटर किती वेळा चालली',
weeklyRuntime: 'एकूण वेळ',
weeklyNoData: 'या आठवड्यात मोटर चालली नाही',
litres: 'ली',
tankSizeLabel: 'टाकीचा आकार',
tankSizePlaceholder: '1000',
configureTankSize: 'लीटर पाहण्यासाठी टाकीचा आकार सेट करा',
hideDeveloperOptions: 'डेव्हलपर पर्याय लपवा',
```

**kn:**
```
notifications: 'ಸೂಚನೆಗಳು',
data: 'ಡೇಟಾ',
about: 'ಬಗ್ಗೆ',
simulating: 'ಡೆಮೋ ಚಾಲನೆಯಲ್ಲಿದೆ',
demoRunning: 'ಡೆಮೋ ಚಾಲನೆಯಲ್ಲಿದೆ…',
noMotorRunsToday: 'ಇಂದು ಮೋಟಾರ್ ಚಾಲನೆಯಾಗಲಿಲ್ಲ',
motorRanOnce: 'ಇಂದು ಮೋಟಾರ್ 1 ಬಾರಿ ಚಾಲನೆಯಾಯಿತು',
motorRanNTimes: 'ಇಂದು ಮೋಟಾರ್ %n ಬಾರಿ ಚಾಲನೆಯಾಯಿತು',
secondsAgo: 'ಕೆಲವು ಸೆಕೆಂಡುಗಳ ಮೊದಲು',
hourAgoOne: '1 ಗಂಟೆ ಮೊದಲು',
sec: 'ಸೆ',
min: 'ನಿ',
hr: 'ಗಂ',
tankLow: 'ಟ್ಯಾಂಕ್‌ನಲ್ಲಿ ನೀರು ಕಡಿಮೆ ಇದೆ',
tankFullCelebration: 'ಟ್ಯಾಂಕ್ ತುಂಬಿದೆ!',
deviceConnecting: 'ನಿಮ್ಮ WaterTank ಸಾಧನವು ಆನ್ ಆಗಿದೆಯೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ. ನಾವು ತಾನಾಗಿಯೇ ಸಂಪರ್ಕಿಸುತ್ತೇವೆ.',
checkDevicePower: 'ಸಾಧನವು ಆನ್ ಆಗಿದೆ ಮತ್ತು ಹತ್ತಿರದಲ್ಲಿದೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',
helpTitle: 'ಸಹಾಯ ಮತ್ತು ಪ್ರಶ್ನೆಗಳು',
helpHowItWorks: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
helpMotorQuestion: 'ಮೋಟಾರ್ ಯಾವಾಗ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ?',
helpMotorAnswer: 'ಗ್ರಾಮದ ನೀರು ಬಂದಾಗ ಮತ್ತು ಟ್ಯಾಂಕ್ 95% ಕ್ಕಿಂತ ಕಡಿಮೆ ಇದ್ದಾಗ ಮೋಟಾರ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಪೈಪ್‌ನಿಂದ ಗಾಳಿ ತೆಗೆದುಹಾಕಲು 45 ಸೆಕೆಂಡುಗಳ ವಿಳಂಬವಿದೆ.',
helpConnectQuestion: "ಆ್ಯಪ್ 'ಸಂಪರ್ಕವಿಲ್ಲ' ಎಂದು ತೋರಿಸುತ್ತಿದೆ. ಏನು ಮಾಡಬೇಕು?",
helpConnectAnswer: 'WaterTank ಸಾಧನವು ಆನ್ ಆಗಿದೆ ಮತ್ತು 10 ಮೀಟರ್ ಒಳಗೆ ಇದೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ. ಆ್ಯಪ್ ತಾನಾಗಿಯೇ ಸಂಪರ್ಕಿಸುತ್ತದೆ — ನೀವು ಏನನ್ನೂ ಒತ್ತುವ ಅಗತ್ಯವಿಲ್ಲ.',
helpManualQuestion: 'ಕೈ ಮೋಡ್ ಎಂದರೇನು?',
helpManualAnswer: 'ಕೈ ಮೋಡ್ ಎಂದರೆ ಯಾರಾದರೂ ಸಾಧನದಲ್ಲಿ ಕೈಯಿಂದ ಪಂಪ್ ಆನ್ ಮಾಡಿದ್ದಾರೆ. ಇದು ಆನ್ ಆಗಿರುವಾಗ ಆ್ಯಪ್ ಕೆಂಪು ಪಟ್ಟಿಯನ್ನು ತೋರಿಸುತ್ತದೆ.',
today2: 'ಇಂದು',
thisWeek: 'ಈ ವಾರ',
weeklyTitle: 'ಈ ವಾರ',
weeklyRuns: 'ಮೋಟಾರ್ ಎಷ್ಟು ಬಾರಿ ಚಾಲನೆಯಾಯಿತು',
weeklyRuntime: 'ಒಟ್ಟು ಸಮಯ',
weeklyNoData: 'ಈ ವಾರ ಮೋಟಾರ್ ಚಾಲನೆಯಾಗಲಿಲ್ಲ',
litres: 'ಲೀ',
tankSizeLabel: 'ಟ್ಯಾಂಕ್ ಗಾತ್ರ',
tankSizePlaceholder: '1000',
configureTankSize: 'ಲೀಟರ್ ನೋಡಲು ಟ್ಯಾಂಕ್ ಗಾತ್ರವನ್ನು ಹೊಂದಿಸಿ',
hideDeveloperOptions: 'ಡೆವಲಪರ್ ಆಯ್ಕೆಗಳನ್ನು ಮರೆಮಾಡಿ',
```

DO NOT touch any other file. DO NOT remove any existing keys. After save, file must still type-check.

---END-MESSAGE---

---

## TASK-045: [DONE] Fix PUMP_STATE_LABELS in models/Event.ts

**Files:**
- `models/Event.ts`

**Model:** `ollama-27b`

**Message:**
Edit ONLY `models/Event.ts`. In the `PUMP_STATE_LABELS` constant (around line 61-66), change:
- `1: "Supply Detected"` → `1: "Water Arrived"`
- `2: "Air Purge (45s)"` → `2: "Motor Starting"`

Keep keys 0 and 3 unchanged. Keep `EVENT_LABELS` and `STOP_REASON_LABELS` unchanged. Keep all interfaces, enums, exports unchanged.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
DO NOT modify any other file.

---END-MESSAGE---

---

## TASK-046: [DONE] Wire i18n into EventRow + bump font sizes

**Files:**
- `components/EventRow.tsx`

**Model:** `local`

**Message:**
Rewrite `components/EventRow.tsx` so all visible strings come from the i18n system. Current file shows raw English from `EVENT_LABELS` and `STOP_REASON_LABELS`.

Constraints:
- `event.epoch`, `event.tankPct`, `event.durationSec`, `event.type`, `event.stopReason` — these are the EXACT field names. Never invent new ones.
- Import `useLanguage` from `@/context/LanguageContext` and call `const { t } = useLanguage();` at the top of the component.
- Keep the visual structure: left coloured border (4px), main row with time/label/tank, sub row with chip + duration.
- DO NOT change any other file.

Mapping (EventType → i18n key):
```
EventType.WATER_ARRIVED  → 'evWaterArrived'
EventType.MOTOR_ON       → 'evMotorOn'
EventType.MOTOR_OFF      → 'evMotorOff'
EventType.ALREADY_FULL   → 'evAlreadyFull'
EventType.MANUAL_ON      → 'evManualOn'
EventType.MANUAL_OFF     → 'evManualOff'
```

Stop reason mapping (StopReason → i18n key):
```
StopReason.TANK_FULL     → 'stopTankFull'
StopReason.SUPPLY_CUT    → 'stopSupplyCut'
StopReason.ALREADY_FULL  → 'stopAlreadyFull'
```

Replace:
- Line ~59: `const label = EVENT_LABELS[event.type] ?? \`Event ${event.type}\`;`
  → with a `getLabel()` helper that returns `t('evWaterArrived')` etc per event.type. Fallback `\`Event ${event.type}\``.
- Line ~93: `{STOP_REASON_LABELS[event.stopReason]}` → call `t()` per stopReason mapping above. Fallback `'—'`.

Font sizes (update in `StyleSheet.create` at bottom):
- `time.fontSize: 12` → `14`
- `label.fontSize: 14` → `16`
- `tank.fontSize: 13` → `14`
- `chipText.fontSize: 12` → `13`
- `duration.fontSize: 12` → `13`

Drop the `EVENT_LABELS` and `STOP_REASON_LABELS` imports from `@/models/Event` (no longer used). Keep `EventType`, `StopReason`, `WaterEvent`, `HIDDEN_EVENT_TYPES` imports.

Pass `event.epoch` to `formatTime` and `event.durationSec` to `formatDuration` (no changes to formatter calls).

After saving, run `wc -l components/EventRow.tsx` — file must be > 100 lines.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
DO NOT modify: services/BLEService.ts

---END-MESSAGE---

---

## TASK-047: [DONE] Translate StatusDot literals

**Files:**
- `components/StatusDot.tsx`

**Model:** `ollama-27b`

**Message:**
Edit ONLY `components/StatusDot.tsx`. The file already imports `useLanguage` and has `const { t } = useLanguage();`.

Find the `label` ternary (around line 46-50):
```ts
const label = connected
  ? simMode
    ? "Simulating"
    : t("connected")
  : t("lookingForDevice");
```

Replace `"Simulating"` (the bare string literal) with `t("simulating")`. Result:
```ts
const label = connected
  ? simMode
    ? t("simulating")
    : t("connected")
  : t("lookingForDevice");
```

DO NOT change anything else. Do not modify styles. Do not modify any other file.

---END-MESSAGE---

---

## TASK-048: [DONE] Make formatters locale-aware

**Files:**
- `utils/formatters.ts`

**Model:** `local`

**Message:**
Rewrite `utils/formatters.ts` to accept optional locale/translator params on the time/date/duration formatters. Hermes on Android supports `Intl.DateTimeFormat('hi-IN' | 'mr-IN' | 'kn-IN' | 'en-IN', ...)` natively, no polyfill needed.

Keep ALL existing exported function names. Maintain backward-compatible default values for every new param so existing callers that don't pass them still work.

Locale map (define at top of file, after any imports):
```ts
const LOCALE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
};

type Lang = 'en' | 'hi' | 'mr' | 'kn';
type Translator = (key: string) => string;

function resolveLocale(lang?: Lang | string): string {
  if (!lang) return 'en-IN';
  return LOCALE_MAP[lang] ?? 'en-IN';
}
```

Update each function signature/body as follows. Keep the file under 200 lines.

1) `formatTime(epoch: number, lang?: Lang): string`
   - Same body, but use `resolveLocale(lang)` instead of hard-coded `'en-IN'` in `toLocaleTimeString(...)`.

2) `formatDate(epoch: number, lang?: Lang): string`
   - Use `resolveLocale(lang)`.

3) `formatShortDate(epoch: number, lang?: Lang): string` — same pattern.

4) `formatDayLabel(dayStr: string, lang?: Lang): string` — same pattern; pass `resolveLocale(lang)` to `toLocaleDateString`.

5) `formatDuration(seconds: number, t?: Translator): string`
   - If `t` provided, use `t('sec')`, `t('min')`, `t('hr')` for unit abbreviations.
   - If not, fallback to `'s'`, `'m'`, `'h'`.
   - Logic:
     ```
     const s = t ? t('sec') : 's';
     const m = t ? t('min') : 'm';
     const h = t ? t('hr') : 'h';
     if (seconds < 60) return `${seconds}${s}`;
     if (seconds < 3600) return `${Math.floor(seconds / 60)}${m}`;
     const hh = Math.floor(seconds / 3600);
     const mm = Math.floor((seconds % 3600) / 60);
     return mm > 0 ? `${hh}${h} ${mm}${m}` : `${hh}${h}`;
     ```

6) `formatRelativeTime(epoch: number | null, t?: Translator): string`
   - If `t` provided, use it. Otherwise English fallback.
   - Logic:
     ```
     if (!epoch) return t ? t('justNow') : 'just now';
     const diff = Math.floor(Date.now() / 1000) - epoch;
     if (diff < 60)    return t ? t('justNow') : 'just now';
     if (diff < 120)   return t ? t('minuteAgo') : '1 min ago';
     if (diff < 3600)  return (t ? t('minutesAgo') : '%n min ago').replace('%n', String(Math.floor(diff / 60)));
     if (diff < 7200)  return t ? t('hourAgoOne') : '1 hour ago';
     if (diff < 86400) return (t ? t('hoursAgo') : '%n hours ago').replace('%n', String(Math.floor(diff / 3600)));
     return `${Math.floor(diff / 86400)}d ago`;
     ```
   - NOTE: the i18n key is `hourAgoOne` (added in TASK-044) — distinct from existing `hourAgo`.

7) `formatHeaderDate(date: Date, lang?: Lang): string`
   - Use `resolveLocale(lang)`.

8) Keep `formatTankPct`, `getTankColor`, `getDayBounds`, `addDays`, `isToday` unchanged.

Validate:
- After save, run `wc -l utils/formatters.ts` — should be roughly 130-170 lines.
- Existing callers like `formatTime(epoch)` (no second arg) must still compile.

DO NOT modify any other file.

---END-MESSAGE---

---

## TASK-049: [DONE] Wire i18n into Records screen

**Files:**
- `app/(tabs)/records.tsx`

**Model:** `local`

**Message:**
Edit `app/(tabs)/records.tsx`. The file already imports `useLanguage` and calls `const { t } = useLanguage();`. We need to: (a) get `lang` from `useLanguage`, (b) pass `t` to `formatRelativeTime` / `formatDuration` if used, (c) pass `lang` to `formatHeaderDate`, (d) translate the footer string.

Constraints:
- Do not break the existing structure. Only modify what's listed below.
- WaterEvent field names: `event.epoch`, `event.tankPct`, `event.durationSec`, `event.type`.
- The motorRuns logic uses `e.type === EventType.MOTOR_OFF && e.durationSec > 0` — keep as is.

Changes:

1) Line ~27: `const { t } = useLanguage();` → change to `const { t, lang } = useLanguage();`

2) Line ~35: `const dateLabel = atToday ? t('today') : formatHeaderDate(currentDate);`
   → `const dateLabel = atToday ? t('today') : formatHeaderDate(currentDate, lang);`

3) Replace the footer block (lines ~102-112). Current:
```tsx
{atToday && (
  <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
    <Text style={[styles.footerText, { color: colors.foreground }]}>
      {motorRuns === 0
        ? 'No motor runs today'
        : motorRuns === 1
          ? 'Motor ran 1 time today'
          : `Motor ran ${motorRuns} times today`}
    </Text>
  </View>
)}
```
With:
```tsx
{atToday && (
  <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
    <Text style={[styles.footerText, { color: colors.foreground }]}>
      {motorRuns === 0
        ? t('noMotorRunsToday')
        : motorRuns === 1
          ? t('motorRanOnce')
          : t('motorRanNTimes').replace('%n', String(motorRuns))}
    </Text>
  </View>
)}
```

DO NOT modify any other file. DO NOT add weekly summary or toggle here (that's TASK-055).

WaterEvent field names: id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced

---END-MESSAGE---

---

## TASK-050: [DONE] Translate Settings section headers + retention chips + dev mode exit

**Files:**
- `app/(tabs)/settings.tsx`

**Model:** `local`

**Message:**
Edit `app/(tabs)/settings.tsx`. Make all section headers and retention chips use i18n. Add a way to exit developer mode. Bump touch targets for language and retention chips.

Constraints:
- Do not modify any other file.
- Keep ALL existing functions (`SectionHeader`, `SettingRow`, `ActionRow`, callbacks) intact.
- The file already imports `useLanguage` and destructures `t, lang, setLanguage`.

Changes:

1) Line ~183: `<SectionHeader title="NOTIFICATIONS" colors={colors} />`
   → `<SectionHeader title={t('notifications').toUpperCase()} colors={colors} />`

2) Line ~211: `<SectionHeader title="DATA" colors={colors} />`
   → `<SectionHeader title={t('data').toUpperCase()} colors={colors} />`

3) Line ~262: `<SectionHeader title="DEBUG" colors={colors} />` — keep as English literal (dev-only).

4) Line ~331: `<SectionHeader title="ABOUT" colors={colors} />`
   → `<SectionHeader title={t('about').toUpperCase()} colors={colors} />`

5) Retention chip text (line ~239): `{days}d` → use the existing keys `days30` / `days60` / `days90`:
```tsx
{days === 30 ? t('days30') : days === 60 ? t('days60') : t('days90')}
```

6) Language chip style — find the `<TouchableOpacity>` for language inside the language section (around line 162-178). Change `paddingVertical: 8` → `paddingVertical: 13`.

7) Retention chip style — in `StyleSheet.create` (around line 389-393), change:
```
retentionChip: {
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 8,
},
```
to:
```
retentionChip: {
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
},
```

8) Inside the DEBUG section, AFTER the existing BLE log block, BEFORE the closing `</View>` of `[styles.section, …]` that wraps DEBUG (around line 327), add a new ActionRow that exits dev mode:
```tsx
<ActionRow
  label={t('hideDeveloperOptions')}
  icon="eye-off"
  onPress={() => {
    setDevMode(false);
    setShowBleLog(false);
    setVersionTaps(0);
  }}
  colors={colors}
/>
```

DO NOT add tank size row here — that's TASK-056. DO NOT add Help row — that's TASK-057.

After save: file should still type-check.

---END-MESSAGE---

---

## TASK-051: [DONE] Translate Dashboard demo string + pass t to formatRelativeTime

**Files:**
- `app/(tabs)/index.tsx`

**Model:** `ollama-27b`

**Message:**
Edit ONLY `app/(tabs)/index.tsx`. The file already imports `useLanguage` and destructures `t`.

Single change: line ~67 currently reads:
```tsx
{simMode ? 'Demo running…' : t('lookingForDevice')}
```
Replace with:
```tsx
{simMode ? t('demoRunning') : t('lookingForDevice')}
```

DO NOT modify any other line. DO NOT modify any other file.

---END-MESSAGE---

---

## TASK-052: [DONE] Rewrite onboarding — language picker first

**Files:**
- `app/onboarding.tsx`

**Model:** `local`

**Message:**
Rewrite `app/onboarding.tsx` to make the language picker page 0 (the first thing the user sees). Currently it's page 2 (the last page). Page 0 must show its title in ALL 4 scripts simultaneously so a user of any language recognises it.

Imports unchanged (`Pressable`, `StyleSheet`, `Text`, `TouchableOpacity`, `View`, `AsyncStorage`, `router`, `Lang`, `useLanguage`, `useColors`).

Structure (3 pages, dots 0/1/2, no Skip button):

Page 0 — language picker
- Header (replaces title): 4 stacked rows OR a single wrapping text showing all 4 scripts:
  ```
  Choose your language
  अपनी भाषा चुनें
  तुमची भाषा निवडा
  ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ
  ```
  Implement as 4 `<Text>` components inside a `<View style={styles.langHeader}>`, each on its own line, fontSize 20, semibold, centered.
- Big icon: 🌐 (above header)
- 2×2 grid of language chips (existing `LANG_LABELS` constant — keep as-is). When user taps a chip: call `setLanguage(code)`. The chip styling already highlights the active one — no extra logic needed because `lang` from `useLanguage` will update.
- After tapping a language, the user must TAP NEXT to advance — no auto-advance.

Page 1 — "Your water tank, always watched"
- Big icon: 💧
- Title: `t('ob1Title')`
- Subtitle: `t('ob1Subtitle')`
- Text re-renders in the chosen language (because `t` reads from context which updated on page 0).

Page 2 — "Works automatically"
- Big icon: ⚡
- Title: `t('ob2Title')`
- Subtitle: `t('ob2Subtitle')`
- CTA reads `t('getStarted')`.

CTA logic (unchanged): tapping "Next" advances page; on page 2 it calls `finish()`. Tapping the CTA on page 0 or 1 advances. Label is `page === 2 ? t('getStarted') : t('next')`.

Dots: 3 dots, page 0/1/2.

Add to `StyleSheet.create`:
```ts
langHeader: {
  gap: 6,
  alignItems: 'center',
  marginBottom: 8,
},
langHeaderText: {
  fontSize: 20,
  fontFamily: 'Inter_600SemiBold',
  textAlign: 'center',
},
```

The page 0 JSX:
```tsx
{page === 0 && (
  <View style={styles.pageContent}>
    <Text style={styles.bigIcon}>🌐</Text>
    <View style={styles.langHeader}>
      <Text style={[styles.langHeaderText, { color: colors.foreground }]}>Choose your language</Text>
      <Text style={[styles.langHeaderText, { color: colors.foreground }]}>अपनी भाषा चुनें</Text>
      <Text style={[styles.langHeaderText, { color: colors.foreground }]}>तुमची भाषा निवडा</Text>
      <Text style={[styles.langHeaderText, { color: colors.foreground }]}>ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ</Text>
    </View>
    <View style={styles.langGrid}>
      {(['en', 'hi', 'mr', 'kn'] as Lang[]).map((code) => {
        const active = lang === code;
        return (
          <Pressable
            key={code}
            onPress={() => setLanguage(code)}
            style={[
              styles.langChip,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.langChipText,
                { color: active ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {LANG_LABELS[code]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
)}
```

Pages 1 and 2 keep their existing icon/title/subtitle structure but get the content shifted:
- Old `page === 0` (💧, ob1Title, ob1Subtitle) becomes new `page === 1`.
- Old `page === 1` (⚡, ob2Title, ob2Subtitle) becomes new `page === 2`.
- Old `page === 2` block (the language picker that used ob3Title) is DELETED — replaced by new page 0 above.

After save, run `wc -l app/onboarding.tsx`. Expect > 150 lines.

DO NOT modify any other file.

---END-MESSAGE---

---

## TASK-053: [DONE] Dashboard tank-low warning + tank-full celebration toast

**Files:**
- `app/(tabs)/index.tsx`

**Model:** `sonnet`

**Message:**
Add two new UX states to the Dashboard:
1. Amber warning banner when tank is below 15% AND device is connected AND motor is OFF.
2. A 3-second celebration toast at the bottom when the motor transitions from running (pumpState === 3) to off (pumpState === 0).

Constraints:
- File already imports `useDevice`, `useColors`, `useLanguage`, `StatusDot`, `WaterTankWidget`.
- Add import: `import { TANK_LOW_PCT } from '@/constants/thresholds';`
- Add hook imports: `useRef` is already used; just add `useState` (already there).
- WaterEvent / DeviceState field names: `deviceState.tank` (number 0-100), `deviceState.connected` (boolean), `deviceState.motorOn` (boolean), `deviceState.pumpState` (number 0-3).
- i18n keys to use: `t('tankLow')`, `t('tankFullCelebration')`. Both added in TASK-044.

Implementation:

1) After existing state declarations, add:
```tsx
const prevPumpStateRef = useRef<number>(deviceState.pumpState);
const [showFullToast, setShowFullToast] = useState(false);

useEffect(() => {
  if (prevPumpStateRef.current === 3 && deviceState.pumpState === 0) {
    setShowFullToast(true);
    const t = setTimeout(() => setShowFullToast(false), 3000);
    return () => clearTimeout(t);
  }
  prevPumpStateRef.current = deviceState.pumpState;
}, [deviceState.pumpState]);
```

2) Compute the low warning condition:
```tsx
const showLowWarning =
  deviceState.connected &&
  !deviceState.motorOn &&
  deviceState.tank < TANK_LOW_PCT &&
  deviceState.tank > 0; // don't show on 0 (disconnected/unknown)
```

3) JSX additions:

After the manual banner (after the closing `)}` of the manual banner block, around line 58), insert the low warning banner:
```tsx
{showLowWarning && (
  <View style={[styles.lowBanner, { backgroundColor: colors.warning }]}>
    <Text style={styles.lowBannerText}>{t('tankLow')}</Text>
  </View>
)}
```

At the bottom of the outer `<ScrollView>`, after the motor card block, render the toast (it's outside the ScrollView's content but inside the screen — wrap the existing ScrollView in a `<View style={{ flex: 1 }}>` and put the toast as a sibling so position: 'absolute' works):

Actually, refactor: wrap the existing `<ScrollView>` in a `<View style={{ flex: 1 }}>`. The toast sits as a sibling of the ScrollView:
```tsx
return (
  <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView ...> ... </ScrollView>
    {showFullToast && (
      <View style={[styles.toast, { backgroundColor: colors.success }]}>
        <Text style={styles.toastText}>{t('tankFullCelebration')}</Text>
      </View>
    )}
  </View>
);
```

4) Add styles:
```ts
lowBanner: {
  width: '100%',
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 16,
  alignItems: 'center',
},
lowBannerText: {
  color: '#FFFFFF',
  fontFamily: 'Inter_600SemiBold',
  fontSize: 14,
},
toast: {
  position: 'absolute',
  bottom: 120,
  alignSelf: 'center',
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 22,
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 5,
},
toastText: {
  color: '#FFFFFF',
  fontFamily: 'Inter_700Bold',
  fontSize: 15,
},
```

DO NOT modify any other file. DO NOT alter the existing manual banner, status dot, tank widget, or motor card behavior.

---END-MESSAGE---

---

## TASK-054: [DONE] Improve disconnection UX with animated indicator + delayed hint

**Files:**
- `app/(tabs)/index.tsx`

**Model:** `sonnet`

**Message:**
Improve the disconnected card on Dashboard. Replace the current single-line "Looking for…" message with a richer state:
- Large title `t('lookingForDevice')`.
- Body `t('deviceConnecting')`.
- Animated pulsing dots (3 dots, sequential pulse).
- After 30 seconds of being disconnected (not in simMode), reveal an additional hint `t('checkDevicePower')`.

Constraints:
- Only modify `app/(tabs)/index.tsx`.
- Already imports `useEffect`, `useRef`, `useState`, `View`, `Text`, `StyleSheet`. Add: `import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';` (already a dependency).
- The disconnected card currently sits inside the ScrollView's contentContainer. Keep it there.
- TASK-053 already wrapped the ScrollView in a flex view — assume that wrapper exists. If not, add it.

Implementation:

1) Add a `disconnectedSec` counter that ticks every second while not connected and not simMode:
```tsx
const [disconnectedSec, setDisconnectedSec] = useState(0);

useEffect(() => {
  if (!deviceState.connected && !simMode) {
    setDisconnectedSec(0);
    const id = setInterval(() => setDisconnectedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }
  setDisconnectedSec(0);
}, [deviceState.connected, simMode]);
```

2) Replace the entire `!deviceState.connected && (...)` block with:
```tsx
{!deviceState.connected && (
  <View style={[styles.disconnectedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[styles.disconnectedTitle, { color: colors.foreground }]}>
      {simMode ? t('demoRunning') : t('lookingForDevice')}
    </Text>
    {!simMode && (
      <>
        <Text style={[styles.disconnectedSub, { color: colors.mutedForeground }]}>
          {t('deviceConnecting')}
        </Text>
        <PulsingDots color={colors.primary} />
        {disconnectedSec > 30 && (
          <Text style={[styles.disconnectedHint, { color: colors.mutedForeground }]}>
            {t('checkDevicePower')}
          </Text>
        )}
      </>
    )}
  </View>
)}
```

3) Define a `PulsingDots` function component inside the same file (above `DashboardScreen`):
```tsx
function PulsingDots({ color }: { color: string }) {
  const a = useSharedValue(0.3);
  const b = useSharedValue(0.3);
  const c = useSharedValue(0.3);

  useEffect(() => {
    a.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 }), withTiming(0.3, { duration: 800 })), -1, false);
    b.value = withRepeat(withSequence(withTiming(0.3, { duration: 400 }), withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 800 })), -1, false);
    c.value = withRepeat(withSequence(withTiming(0.3, { duration: 800 }), withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
  }, []);

  const sa = useAnimatedStyle(() => ({ opacity: a.value }));
  const sb = useAnimatedStyle(() => ({ opacity: b.value }));
  const sc = useAnimatedStyle(() => ({ opacity: c.value }));

  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, sa]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, sb]} />
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, sc]} />
    </View>
  );
}
```

4) Update styles:
- `disconnectedTitle.fontSize: 14` → `16`
- `disconnectedTitle.fontFamily: 'Inter_400Regular'` → `'Inter_600SemiBold'`
- Add `disconnectedHint: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18, marginTop: 8, opacity: 0.85 }`

DO NOT modify any other file. Do not touch TASK-053's tank-low banner / toast.

---END-MESSAGE---

---

## TASK-055: [DONE] Add weekly summary toggle to Records

**Files:**
- `app/(tabs)/records.tsx`
- `storage/database.ts` (read-only — verify existing functions)

**Model:** `sonnet`

**Message:**
Add a Today / This Week toggle to the Records screen. Today mode = existing behavior. This Week mode shows last-7-days aggregate stats.

Constraints:
- Modify ONLY `app/(tabs)/records.tsx`. Use existing DB helpers from `@/storage/database` and `@/context/DeviceContext` — do NOT add new DB queries unless absolutely necessary.
- Use `deviceContext.getStats()` which returns `getDailyStats(60)` — an array of `DailyStats { day: string; totalSec: number; runs: number }`.
- WaterEvent / DailyStats field names (never deviate): `event.epoch`, `event.tankPct`, `event.durationSec`, `event.type`, `event.stopReason`. `DailyStats.day`, `DailyStats.totalSec`, `DailyStats.runs`.
- i18n keys (added in TASK-044): `today2`, `thisWeek`, `weeklyTitle`, `weeklyRuns`, `weeklyRuntime`, `weeklyNoData`.

Implementation:

1) Add to imports: `getStats` from deviceContext. Already destructured? No — currently only `getEventsForDate, refreshKey`. Add `getStats` to the destructure.

2) Add state:
```tsx
const [mode, setMode] = useState<'today' | 'week'>('today');
```

3) At the top of the screen body, BEFORE the date-nav header, render a segmented toggle:
```tsx
<View style={styles.tabRow}>
  <TouchableOpacity
    onPress={() => setMode('today')}
    style={[styles.tabChip, { backgroundColor: mode === 'today' ? colors.primary : colors.muted }]}
  >
    <Text style={[styles.tabChipText, { color: mode === 'today' ? colors.primaryForeground : colors.foreground }]}>
      {t('today2')}
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    onPress={() => setMode('week')}
    style={[styles.tabChip, { backgroundColor: mode === 'week' ? colors.primary : colors.muted }]}
  >
    <Text style={[styles.tabChipText, { color: mode === 'week' ? colors.primaryForeground : colors.foreground }]}>
      {t('thisWeek')}
    </Text>
  </TouchableOpacity>
</View>
```

4) Wrap the existing date-nav header + FlatList + footer in `{mode === 'today' && (<> ... </>)}`.

5) Render a weekly view when `mode === 'week'`:
```tsx
{mode === 'week' && <WeeklyView />}
```

Define `WeeklyView` as an inner function inside the same file (above export default), or inline as JSX. Inline approach:
```tsx
{mode === 'week' && (() => {
  const stats = getStats(); // DailyStats[] for last 60 days
  // Filter to last 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
  const weekStats = stats.filter((s) => s.day >= sevenDaysAgoStr);
  const totalRuns = weekStats.reduce((sum, s) => sum + s.runs, 0);
  const totalSec = weekStats.reduce((sum, s) => sum + s.totalSec, 0);

  if (totalRuns === 0) {
    return (
      <View style={styles.weekEmpty}>
        <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
        <Text style={[styles.weekEmptyText, { color: colors.mutedForeground }]}>
          {t('weeklyNoData')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.weekContent}>
      <View style={[styles.weekSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.weekTitle, { color: colors.foreground }]}>{t('weeklyTitle')}</Text>
        <View style={styles.weekKpis}>
          <View style={styles.weekKpi}>
            <Text style={[styles.weekKpiValue, { color: colors.primary }]}>{totalRuns}</Text>
            <Text style={[styles.weekKpiLabel, { color: colors.mutedForeground }]}>{t('weeklyRuns')}</Text>
          </View>
          <View style={styles.weekKpi}>
            <Text style={[styles.weekKpiValue, { color: colors.primary }]}>{formatDuration(totalSec, t)}</Text>
            <Text style={[styles.weekKpiLabel, { color: colors.mutedForeground }]}>{t('weeklyRuntime')}</Text>
          </View>
        </View>
      </View>
      {weekStats.map((s) => (
        <View key={s.day} style={[styles.weekDayRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.weekDayLabel, { color: colors.foreground }]}>{s.day}</Text>
          <Text style={[styles.weekDayStat, { color: colors.mutedForeground }]}>
            {s.runs} · {formatDuration(s.totalSec, t)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
})()}
```

Add `import { ScrollView } from 'react-native';` if not already imported (FlatList is already imported but not ScrollView). Add it.

Add `import { formatDuration } from '@/utils/formatters';` to the existing formatters import.

Add styles:
```ts
tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
tabChip: { flex: 1, paddingVertical: 12, borderRadius: 22, alignItems: 'center' },
tabChipText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
weekContent: { padding: 16, gap: 8, paddingBottom: 120 },
weekSummary: { borderRadius: 14, borderWidth: 1, padding: 18, gap: 14, marginBottom: 8 },
weekTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
weekKpis: { flexDirection: 'row', gap: 24 },
weekKpi: { flex: 1, gap: 4 },
weekKpiValue: { fontSize: 28, fontFamily: 'Inter_700Bold' },
weekKpiLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
weekDayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
weekDayLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
weekDayStat: { fontSize: 13, fontFamily: 'Inter_400Regular' },
weekEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
weekEmptyText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
```

DO NOT modify any other file. The existing today-mode behavior must remain unchanged when `mode === 'today'`.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
DailyStats field names: day, totalSec, runs

---END-MESSAGE---

---

## TASK-056: [DONE] Tank size config + litres display on Dashboard

**Files:**
- `app/(tabs)/settings.tsx`
- `app/(tabs)/index.tsx`

**Model:** `sonnet`

**Message:**
Add a tank-size input in Settings (DATA section) and a litres readout on the Dashboard. Persist via AsyncStorage at key `@watertank_tank_size_litres`.

Constraints:
- Default value: empty (no display until user configures).
- WaterEvent field names unchanged. DeviceState field `deviceState.tank` is the percentage (0-100).
- i18n keys: `t('tankSizeLabel')`, `t('tankSizePlaceholder')`, `t('litres')`. All added in TASK-044.

Part A — Settings (`app/(tabs)/settings.tsx`):

1) Add imports at the top:
```tsx
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
```

2) Add state inside `SettingsScreen`:
```tsx
const [tankSize, setTankSize] = useState<string>('');

useEffect(() => {
  AsyncStorage.getItem('@watertank_tank_size_litres').then((v) => {
    if (v) setTankSize(v);
  });
}, []);

const saveTankSize = useCallback(async (v: string) => {
  // Strip non-digits
  const clean = v.replace(/[^0-9]/g, '').slice(0, 6);
  setTankSize(clean);
  if (clean) await AsyncStorage.setItem('@watertank_tank_size_litres', clean);
  else await AsyncStorage.removeItem('@watertank_tank_size_litres');
}, []);
```

Add `useEffect` to the existing React import.

3) In the DATA section, BEFORE the retention row (around line 213), insert a new row:
```tsx
<View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
  <Text style={[styles.rowLabel, { color: colors.foreground }]}>{t('tankSizeLabel')}</Text>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <TextInput
      value={tankSize}
      onChangeText={saveTankSize}
      placeholder={t('tankSizePlaceholder')}
      placeholderTextColor={colors.mutedForeground}
      keyboardType="numeric"
      style={{
        minWidth: 80,
        textAlign: 'right',
        color: colors.foreground,
        fontFamily: 'Inter_500Medium',
        fontSize: 15,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
      }}
    />
    <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14 }}>
      {t('litres')}
    </Text>
  </View>
</View>
```

Part B — Dashboard (`app/(tabs)/index.tsx`):

1) Add imports:
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
```

2) Add state + effect inside `DashboardScreen`:
```tsx
const [tankSize, setTankSize] = useState<number>(0);

useEffect(() => {
  AsyncStorage.getItem('@watertank_tank_size_litres').then((v) => {
    const n = parseInt(v || '0', 10);
    if (!isNaN(n)) setTankSize(n);
  });
}, [deviceState.tank]); // re-read on every state tick (cheap)
```

3) After the `<WaterTankWidget …/>` inside `tankSection`, render litres if configured:
```tsx
<WaterTankWidget pct={deviceState.tank} connected={deviceState.connected} />
{tankSize > 0 && deviceState.connected && (
  <Text style={[styles.litresText, { color: colors.foreground }]}>
    {Math.round((tankSize * deviceState.tank) / 100)} {t('litres')}
  </Text>
)}
```

4) Add style:
```ts
litresText: {
  fontSize: 22,
  fontFamily: 'Inter_600SemiBold',
  marginTop: -4,
},
```

DO NOT modify any other file.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced

---END-MESSAGE---

---

## TASK-057: [DONE] Help/FAQ screen + Settings entry

**Files:**
- `app/help.tsx` (new file)
- `app/(tabs)/settings.tsx`
- `app/_layout.tsx`

**Model:** `sonnet`

**Message:**
Create a Help/FAQ screen and add an entry point from Settings.

Constraints:
- New file: `app/help.tsx`. After creation, verify `wc -l app/help.tsx` > 80 lines.
- Routing: register `help` as a Stack.Screen in `app/_layout.tsx` (without headerShown true — we render our own back button).
- i18n keys (added in TASK-044): `t('helpTitle')`, `t('helpMotorQuestion')`, `t('helpMotorAnswer')`, `t('helpConnectQuestion')`, `t('helpConnectAnswer')`, `t('helpManualQuestion')`, `t('helpManualAnswer')`.

Part A — Create `app/help.tsx`:

```tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

type FaqItem = { q: string; a: string };

function Accordion({ item }: { item: FaqItem }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        style={styles.row}
      >
        <Text style={[styles.q, { color: colors.foreground }]}>{item.q}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mutedForeground} />
      </TouchableOpacity>
      {open && (
        <Text style={[styles.a, { color: colors.mutedForeground }]}>{item.a}</Text>
      )}
    </View>
  );
}

export default function HelpScreen() {
  const colors = useColors();
  const { t } = useLanguage();

  const items: FaqItem[] = [
    { q: t('helpMotorQuestion'), a: t('helpMotorAnswer') },
    { q: t('helpConnectQuestion'), a: t('helpConnectAnswer') },
    { q: t('helpManualQuestion'), a: t('helpManualAnswer') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Feather name="chevron-left" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('helpTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((it, i) => (
          <Accordion key={i} item={it} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  q: { flex: 1, fontSize: 16, fontFamily: 'Inter_600SemiBold', lineHeight: 22 },
  a: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 21, marginTop: 4 },
});
```

Part B — `app/_layout.tsx`:

Inside the `<Stack>` in `RootLayoutNav`, add a new screen registration after the onboarding line:
```tsx
<Stack.Screen name="help" options={{ headerShown: false }} />
```

Part C — `app/(tabs)/settings.tsx`:

1) Add `import { router } from 'expo-router';` to existing imports.
2) In the ABOUT section, BEFORE the version row TouchableOpacity (around line 333), insert:
```tsx
<ActionRow
  label={t('helpTitle')}
  icon="help-circle"
  onPress={() => router.push('/help')}
  colors={colors}
/>
```

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
DO NOT modify any other file. After creating `app/help.tsx`, verify `wc -l app/help.tsx` is > 80.

---END-MESSAGE---

---

## TASK-058: [DONE] Local push notifications service + Device wiring

**Files:**
- `services/NotificationService.ts` (new file)
- `context/DeviceContext.tsx`
- `app/_layout.tsx`
- `app.json`

**Model:** `sonnet`

**Message:**
Wire local push notifications for motor state changes. Uses expo-notifications v0.29 (already in package.json). NO server. Notifications fire IMMEDIATELY in response to state changes (we avoid scheduled future notifications because of the known Expo 52 bug where they fire instantly).

Constraints:
- Android channel MUST be created before any notify (Android 8+ requirement). Use channel id `motor`.
- Android 13+ requires runtime POST_NOTIFICATIONS permission.
- Gate motor-on/off behind existing `settings.notifyMotorOn` / `settings.notifyMotorOff`. For tank-low, gate behind `notifyMotorOn` (no separate setting yet — re-use motor-on toggle as "important alerts").
- Translator: NotificationService takes a translator function at notify-time, so notification text matches user's language.
- Field names (never deviate): `deviceState.tank` (number 0-100), `deviceState.pumpState` (0-3). `WaterEvent` not touched here.

Part A — Create `services/NotificationService.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { StopReason } from '@/models/Event';

type Translator = (key: string) => string;

let channelReady = false;
let permissionGranted = false;

async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('motor', {
    name: 'Motor alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 200, 200],
  });
  channelReady = true;
}

export async function requestPermissions(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') {
      permissionGranted = true;
      await ensureChannel();
      return true;
    }
    const res = await Notifications.requestPermissionsAsync();
    permissionGranted = res.status === 'granted';
    if (permissionGranted) await ensureChannel();
    return permissionGranted;
  } catch (e) {
    console.warn('notif perm error', e);
    return false;
  }
}

async function notify(title: string, body: string) {
  if (!permissionGranted) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null, // fire immediately — avoids Expo 52 future-schedule bug
      identifier: undefined,
    });
  } catch (e) {
    console.warn('notify error', e);
  }
}

export async function scheduleMotorOn(tankPct: number, t: Translator) {
  await ensureChannel();
  const title = t('evMotorOn');
  const body = `${t('tankLevel')}: ${Math.round(tankPct)}%`;
  await notify(title, body);
}

export async function scheduleMotorOff(tankPct: number, reason: StopReason, t: Translator) {
  await ensureChannel();
  const title = t('evMotorOff');
  let reasonText = '';
  if (reason === StopReason.TANK_FULL) reasonText = t('stopTankFull');
  else if (reason === StopReason.SUPPLY_CUT) reasonText = t('stopSupplyCut');
  const body = reasonText ? `${reasonText} · ${Math.round(tankPct)}%` : `${t('tankLevel')}: ${Math.round(tankPct)}%`;
  await notify(title, body);
}

export async function scheduleTankLow(t: Translator) {
  await ensureChannel();
  await notify(t('tankLow'), t('checkDevicePower'));
}

export async function cancelAll() {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
}

export default {
  requestPermissions,
  scheduleMotorOn,
  scheduleMotorOff,
  scheduleTankLow,
  cancelAll,
};
```

After creating, `wc -l services/NotificationService.ts` must be > 60.

Part B — `context/DeviceContext.tsx`:

1) Add imports:
```ts
import * as NotificationService from '@/services/NotificationService';
import { useLanguage } from '@/context/LanguageContext';
import { TANK_LOW_PCT } from '@/constants/thresholds';
```

2) Inside `DeviceProvider`, add:
```ts
const { t } = useLanguage();
const prevPumpStateRef = useRef<number>(0);
const tankLowFiredRef = useRef<boolean>(false);

useEffect(() => {
  const prev = prevPumpStateRef.current;
  const cur = deviceState.pumpState;

  // Motor ON: pumpState transitions to 3
  if (prev !== 3 && cur === 3 && settings.notifyMotorOn) {
    NotificationService.scheduleMotorOn(deviceState.tank, t);
  }
  // Motor OFF: pumpState was 3, now 0 (or any non-3 from 3)
  if (prev === 3 && cur !== 3 && settings.notifyMotorOff) {
    // Find most recent MOTOR_OFF event for stopReason (cheap: re-query DB or default to NONE)
    NotificationService.scheduleMotorOff(deviceState.tank, /* StopReason */ 0, t);
  }
  prevPumpStateRef.current = cur;
}, [deviceState.pumpState, deviceState.tank, settings.notifyMotorOn, settings.notifyMotorOff, t]);

// Tank-low alert (fires once per crossing)
useEffect(() => {
  if (
    deviceState.connected &&
    !deviceState.motorOn &&
    deviceState.tank > 0 &&
    deviceState.tank < TANK_LOW_PCT &&
    settings.notifyMotorOn
  ) {
    if (!tankLowFiredRef.current) {
      tankLowFiredRef.current = true;
      NotificationService.scheduleTankLow(t);
    }
  } else if (deviceState.tank >= TANK_LOW_PCT) {
    tankLowFiredRef.current = false; // reset when refilled
  }
}, [deviceState.tank, deviceState.motorOn, deviceState.connected, settings.notifyMotorOn, t]);
```

Note: `LanguageProvider` already wraps `DeviceProvider` in `_layout.tsx` so `useLanguage()` is safe to call here.

Part C — `app/_layout.tsx`:

Add to imports:
```ts
import * as NotificationService from '@/services/NotificationService';
```

Inside `RootLayout`, after the fontsLoaded useEffect, add:
```ts
useEffect(() => {
  NotificationService.requestPermissions();
}, []);
```

Part D — `app.json`:

1) Add to `android.permissions` array: `"POST_NOTIFICATIONS"`.

2) Add to `plugins` array, replacing the existing array:
```json
"plugins": [
  "expo-router",
  "expo-font",
  "react-native-ble-plx",
  [
    "expo-notifications",
    {
      "icon": "./assets/images/icon.png",
      "color": "#0EA5E9",
      "defaultChannel": "motor"
    }
  ]
]
```

DO NOT modify any other file. DO NOT change `services/BLEService.ts`.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced

---END-MESSAGE---

---

## TASK-059: [DONE] Load Noto Sans Devanagari + Kannada fonts and add useAppFont hook

**Files:**
- `app/_layout.tsx`
- `hooks/useAppFont.ts` (new file)

**Model:** `local`

**Message:**
Load language-specific Noto Sans fonts so Hindi/Marathi/Kannada text renders crisply, not in the Android system font. Then provide a hook that returns the correct fontFamily based on language. This task ONLY loads the fonts and adds the hook — it does NOT change any component (that's TASK-060).

Constraints:
- Packages already installed: `@expo-google-fonts/noto-sans-devanagari@^0.4.1`, `@expo-google-fonts/noto-sans-kannada@^0.4.3`.
- Existing `useFonts` call in `app/_layout.tsx` loads only Inter weights. Extend it.
- Hindi and Marathi BOTH use Devanagari script → same font.

Part A — `app/_layout.tsx`:

1) Add imports at the top, after the existing inter import:
```ts
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import {
  NotoSansKannada_400Regular,
  NotoSansKannada_700Bold,
} from '@expo-google-fonts/noto-sans-kannada';
```

2) Extend the `useFonts({...})` map to:
```ts
const [fontsLoaded, fontError] = useFonts({
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_700Bold,
  NotoSansKannada_400Regular,
  NotoSansKannada_700Bold,
});
```

No other changes to `_layout.tsx`.

Part B — Create `hooks/useAppFont.ts`:

```ts
import { useMemo } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import type { Lang } from '@/constants/i18n';

export interface AppFontSet {
  regular: string;
  medium: string;
  semiBold: string;
  bold: string;
}

const INTER: AppFontSet = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

const DEVANAGARI: AppFontSet = {
  regular: 'NotoSansDevanagari_400Regular',
  medium: 'NotoSansDevanagari_400Regular', // package doesn't ship 500; fall back to 400
  semiBold: 'NotoSansDevanagari_700Bold',
  bold: 'NotoSansDevanagari_700Bold',
};

const KANNADA: AppFontSet = {
  regular: 'NotoSansKannada_400Regular',
  medium: 'NotoSansKannada_400Regular',
  semiBold: 'NotoSansKannada_700Bold',
  bold: 'NotoSansKannada_700Bold',
};

export function fontSetFor(lang: Lang): AppFontSet {
  if (lang === 'hi' || lang === 'mr') return DEVANAGARI;
  if (lang === 'kn') return KANNADA;
  return INTER;
}

export function useAppFont(): AppFontSet {
  const { lang } = useLanguage();
  return useMemo(() => fontSetFor(lang), [lang]);
}
```

After save, verify `wc -l hooks/useAppFont.ts` > 30.

DO NOT modify any other file.

---END-MESSAGE---

---

## TASK-060: [DONE] Apply useAppFont in EventRow and StatusDot

**Files:**
- `components/EventRow.tsx`
- `components/StatusDot.tsx`

**Model:** `local`

**Message:**
Replace hard-coded `fontFamily: 'Inter_*'` values in `EventRow.tsx` and `StatusDot.tsx` with values from `useAppFont()`. This makes Hindi/Marathi/Kannada text render in Noto Sans.

Constraints:
- TASK-046 already changed font sizes in EventRow. Keep those sizes — only change fontFamily.
- TASK-059 created `hooks/useAppFont.ts`. Import from `@/hooks/useAppFont`.
- DO NOT change layout, colors, or behavior.

Part A — `components/EventRow.tsx`:

1) Add import:
```ts
import { useAppFont } from '@/hooks/useAppFont';
```

2) Inside `EventRow`, after `const colors = useColors();`, add:
```ts
const font = useAppFont();
```

3) In the JSX, where styles are applied inline, override fontFamily where it currently comes from StyleSheet:
   - The cleanest approach: replace `styles.time`, `styles.label`, `styles.tank`, `styles.chipText`, `styles.duration` usage with `[styles.time, { fontFamily: font.regular }]` etc.

Specifically:
```tsx
<Text style={[styles.time, { color: colors.mutedForeground, fontFamily: font.regular }]}>{timeStr}</Text>
<Text style={[styles.label, { color: colors.foreground, fontFamily: font.medium }]} numberOfLines={1}>
  {label}
</Text>
<Text style={[styles.tank, { color: colors.mutedForeground, fontFamily: font.regular }]}>{tankStr}</Text>
...
<Text style={[styles.chipText, { color: getStopReasonColor(event.stopReason, colors), fontFamily: font.semiBold }]}>
  {/* chip text */}
</Text>
<Text style={[styles.duration, { color: colors.mutedForeground, fontFamily: font.regular }]}>
  {formatDuration(event.durationSec)}
</Text>
```

You may remove the now-unused `fontFamily` entries from StyleSheet entries (or leave them as fallback — your call, but cleaner to remove).

Part B — `components/StatusDot.tsx`:

1) Add import: `import { useAppFont } from '@/hooks/useAppFont';`
2) After `const colors = useColors();`, add: `const font = useAppFont();`
3) Apply font:
```tsx
<Text style={[styles.label, { color: colors.foreground, fontFamily: font.medium }]}>{label}</Text>
{connected && lastSyncAt && (
  <Text style={[styles.syncTime, { color: colors.mutedForeground, fontFamily: font.regular }]}>
    {t("lastUpdated").replace("%t", formatRelativeTime(lastSyncAt))}
  </Text>
)}
```

DO NOT modify any other file. DO NOT touch the `simBadgeText` (it's English "SIM" — Inter is fine).

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced

---END-MESSAGE---

---

## TASK-061: [DONE] Strip letterSpacing for non-Latin scripts

**Files:**
- `app/(tabs)/index.tsx`

**Model:** `ollama-27b`

**Message:**
Edit ONLY `app/(tabs)/index.tsx`. Devanagari and Kannada conjuncts (joined letter forms) break visually when positive letterSpacing is applied. The manual banner currently uses `letterSpacing: 1` which would break Hindi/Marathi/Kannada banner text.

1) The component already destructures `t` from `useLanguage`. Also destructure `lang`:
   - Find: `const { t } = useLanguage();`
   - Replace: `const { t, lang } = useLanguage();`

2) In the `manualBannerText` style usage (around line 56), the style currently comes from StyleSheet only. Override letterSpacing inline:
   - Find:
     ```tsx
     <Text style={styles.manualBannerText}>{t('pumpManual')}</Text>
     ```
   - Replace with:
     ```tsx
     <Text style={[styles.manualBannerText, { letterSpacing: lang === 'en' ? 1 : 0 }]}>
       {t('pumpManual')}
     </Text>
     ```

DO NOT modify any other line. DO NOT touch StyleSheet entries. DO NOT modify any other file.

---END-MESSAGE---

---

## TASK-062: [DONE] TypeScript verification pass + fix any errors

**Files:**
- (any file flagged by tsc)

**Model:** `sonnet`

**Message:**
Run `npm run typecheck` (which executes `tsc -p tsconfig.json --noEmit`) from `/Users/parasjain/dev/apps/watertank-replit-build/`. Fix every error.

Key risk areas after TASKS 044-061:
- `utils/formatters.ts` — added optional `t?: Translator` and `lang?: Lang` params. Callers must still compile.
- `services/NotificationService.ts` — new file. Confirm `StopReason` import path resolves.
- `hooks/useAppFont.ts` — new file. Confirm `Lang` type import.
- `app/help.tsx` — new file. Confirm router/Stack types.
- `app/onboarding.tsx` — restructured pages.
- `app/(tabs)/records.tsx` — new ScrollView import, new state, weekly view inline IIFE.
- `app/(tabs)/index.tsx` — multiple TASKs touched this. Most likely conflict point.
- `context/DeviceContext.tsx` — added `useLanguage()` call, new refs/effects.

Rules while fixing:
- Do NOT change behavior, only types.
- Prefer narrowing over `as any`.
- If a function is exported with a new optional param, ensure ALL call sites either pass the new param or rely on the default — do not change call sites unless tsc complains.
- WaterEvent field names: id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced. Never invent new names.

Also verify:
- `app.json` is valid JSON (no trailing commas after the expo-notifications plugin entry).
- `services/BLEService.ts` is UNCHANGED.

Then run `npm run build:release` from project root. If APK builds and `outputs/apk/release/app-release.apk` is produced, mark this task DONE. If the gradle build fails, debug — most likely cause is the expo-notifications plugin config in app.json or a Devanagari/Kannada font asset name mismatch.

After successful build, run:
```
adb devices
adb -s emulator-5554 install -r /Users/parasjain/dev/apps/watertank-replit-build/watertank-replit-release.apk
adb -s emulator-5554 logcat -b crash *:E ReactNativeJS:V | head -200
```

Capture any runtime crashes and fix them in a follow-up if found.

DO NOT modify: services/BLEService.ts

---END-MESSAGE---

---

## VERIFICATION CHECKLIST (Opus runs this after all tasks DONE)
- [ ] All Records event labels translate correctly in hi/mr/kn
- [ ] Onboarding page 0 shows language picker, tapping updates subsequent pages
- [ ] Notifications fire on motor start/stop in simulation mode
- [ ] Tank-low warning appears when tank < 15%
- [ ] Tank-full toast appears when motor stops
- [ ] Weekly summary shows correct totals
- [ ] Tank litres display works with configured tank size
- [ ] Help FAQ opens and closes correctly
- [ ] All section headers in Settings translate
- [ ] Retention chips show "30 दिन" / "30 दिवस" in hi/mr
- [ ] No letterSpacing breaking Devanagari/Kannada text
- [ ] TypeScript: 0 errors
- [ ] APK builds successfully
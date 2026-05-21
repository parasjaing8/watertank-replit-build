# TASKS.md — WaterTank v2 Redesign
# Target: rural India farmers, multilingual, simple UI
# Executor: Qwen3.6-35B via aider (run-tasks.py)
# Verifier: Claude Sonnet (after all DONE)
# Run: python3 run-tasks.py            — runs all TODO tasks
# Run: python3 run-tasks.py --dry-run  — preview only
# Run: python3 run-tasks.py 30         — run specific task
#
# FIELD NAMES (never deviate): event.epoch, event.tankPct, event.durationSec, event.flowLpm
# DO NOT modify: services/BLEService.ts (complex BLE API — Sonnet only)

## TASK-030: [TODO] Update color palette — PennyWise-inspired dark theme
**Files:** `constants/colors.ts`
**Model:** local
**Message:**
Replace the entire contents of `constants/colors.ts` with a new palette inspired by PennyWise AI's dark Material You aesthetic. The file already exports a default object with `light`, `dark`, and `radius` keys — preserve that exact shape so `hooks/useColors.ts` keeps working.

Requirements:
- Dark theme is the primary design target (rural users will get dark by default).
- Tank-full color must be BLUE (#2563EB), NOT red. Red signals danger in this app.
- Primary accent: cyan/teal (#0EA5E9).
- Background: deep navy (#0A1628).
- Card surface: slightly lighter navy (#0F2040).
- ADD these new tank-level tokens (in BOTH light and dark): `tankEmpty`, `tankLow`, `tankMid`, `tankHigh`, `tankFull`.
- KEEP all existing keys (text, tint, background, foreground, card, cardForeground, primary, primaryForeground, secondary, secondaryForeground, muted, mutedForeground, accent, accentForeground, destructive, destructiveForeground, border, input, success, successForeground, warning, warningForeground, tankGreen, tankOrange, tankRed, motorOn, motorOff, manualOverride, supplyBlue). Code elsewhere still reads them.
- Do NOT remove or rename any existing key. Only update hex values and add the 5 new tank tokens.

Use these exact values for the `dark` palette:
```
text: '#E2EDF9'
tint: '#0EA5E9'
background: '#0A1628'
foreground: '#E2EDF9'
card: '#0F2040'
cardForeground: '#E2EDF9'
primary: '#0EA5E9'
primaryForeground: '#FFFFFF'
secondary: '#162A42'
secondaryForeground: '#93C5FD'
muted: '#0F2040'
mutedForeground: '#6B8CAE'
accent: '#1E3A5F'
accentForeground: '#93C5FD'
destructive: '#EF4444'
destructiveForeground: '#FFFFFF'
border: '#1E3A5F'
input: '#162A42'
success: '#22C55E'
successForeground: '#FFFFFF'
warning: '#F59E0B'
warningForeground: '#FFFFFF'
tankGreen: '#22C55E'
tankOrange: '#F59E0B'
tankRed: '#EF4444'
motorOn: '#22C55E'
motorOff: '#475569'
manualOverride: '#F59E0B'
supplyBlue: '#0EA5E9'
tankEmpty: '#93C5FD'
tankLow: '#3B82F6'
tankMid: '#0EA5E9'
tankHigh: '#0284C7'
tankFull: '#2563EB'
```

For `light`, use the same KEY set with reasonable light-mode values (white background, dark text, same tank colors). Keep `radius: 12` at the end.

Use TypeScript object syntax exactly like the existing file. Default export the colors object.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-031: [TODO] Create i18n translations file
**Files:** `constants/i18n.ts`
**Model:** local
**Message:**
Create a new file `constants/i18n.ts`. This file holds all UI strings for 4 languages: English (`en`), Hindi (`hi`), Marathi (`mr`), Kannada (`kn`). No i18n library — just a plain TypeScript object lookup.

Export shape:
```ts
export type Lang = 'en' | 'hi' | 'mr' | 'kn';

export interface Translations {
  appName: string;
  lookingForDevice: string;
  connected: string;
  disconnected: string;
  lastUpdated: string;
  tankLevel: string;
  motorRunning: string;
  motorOff: string;
  motorStarting: string;
  waterArrived: string;
  tankFull: string;
  pumpManual: string;
  waitingForWater: string;
  nothingHappening: string;
  evWaterArrived: string;
  evMotorOn: string;
  evMotorOff: string;
  evAlreadyFull: string;
  evManualOn: string;
  evManualOff: string;
  stopTankFull: string;
  stopSupplyCut: string;
  stopAlreadyFull: string;
  records: string;
  today: string;
  noEventsToday: string;
  waitingMessage: string;
  noEventsDate: string;
  settings: string;
  language: string;
  notifyMotorOn: string;
  notifyMotorOff: string;
  keepRecordsFor: string;
  days30: string;
  days60: string;
  days90: string;
  shareRecords: string;
  clearAllData: string;
  clearConfirmTitle: string;
  clearConfirmMsg: string;
  deleteAll: string;
  cancel: string;
  cleared: string;
  deviceInfo: string;
  appVersion: string;
  deviceName: string;
  aboutTitle: string;
  ob1Title: string;
  ob1Subtitle: string;
  ob2Title: string;
  ob2Subtitle: string;
  ob3Title: string;
  ob3Subtitle: string;
  getStarted: string;
  next: string;
  tabDashboard: string;
  tabRecords: string;
  tabSettings: string;
  justNow: string;
  minuteAgo: string;
  minutesAgo: string;
  hourAgo: string;
  hoursAgo: string;
}

export const TRANSLATIONS: Record<Lang, Translations> = {
  en: { ... },
  hi: { ... },
  mr: { ... },
  kn: { ... },
};
```

English values (copy verbatim):
```
appName: 'WaterTank'
lookingForDevice: 'Looking for your device...'
connected: 'Connected'
disconnected: 'Not connected'
lastUpdated: 'Updated %t ago'
tankLevel: 'Tank Level'
motorRunning: 'Motor Running'
motorOff: 'Motor is Off'
motorStarting: 'Motor starting...'
waterArrived: 'Water Arrived'
tankFull: 'Tank Full'
pumpManual: 'Pump Set to Manual'
waitingForWater: 'Waiting for water...'
nothingHappening: 'Nothing happening right now'
evWaterArrived: 'Water Arrived'
evMotorOn: 'Motor Started'
evMotorOff: 'Motor Stopped'
evAlreadyFull: 'Water Arrived (tank was already full)'
evManualOn: 'Pump set to manual'
evManualOff: 'Manual mode turned off'
stopTankFull: 'Tank Full'
stopSupplyCut: 'Water supply ended'
stopAlreadyFull: 'Already full'
records: 'Records'
today: 'Today'
noEventsToday: 'No events today'
waitingMessage: 'Waiting for water. Motor will start automatically when water arrives.'
noEventsDate: 'No events on this day'
settings: 'Settings'
language: 'Language'
notifyMotorOn: 'Notify when motor starts'
notifyMotorOff: 'Notify when motor stops'
keepRecordsFor: 'How long to keep records'
days30: '30 days'
days60: '60 days'
days90: '90 days'
shareRecords: 'Share my records'
clearAllData: 'Delete all records'
clearConfirmTitle: 'Delete all records?'
clearConfirmMsg: 'This will permanently delete all your water supply and motor records. This cannot be undone.'
deleteAll: 'Delete All'
cancel: 'Cancel'
cleared: 'Done'
deviceInfo: 'Device'
appVersion: 'App Version'
deviceName: 'WaterTank'
aboutTitle: 'About'
ob1Title: 'Your water tank, always watched'
ob1Subtitle: 'This app automatically starts and stops your motor when village water arrives.'
ob2Title: 'Works automatically, day or night'
ob2Subtitle: 'When Panchayat water arrives, the motor starts by itself. It stops when the tank is full or water supply ends.'
ob3Title: 'Choose your language'
ob3Subtitle: 'You can change this later in Settings.'
getStarted: 'Get Started'
next: 'Next'
tabDashboard: 'Dashboard'
tabRecords: 'Records'
tabSettings: 'Settings'
justNow: 'just now'
minuteAgo: '1 min ago'
minutesAgo: '%n min ago'
hourAgo: '1 hour ago'
hoursAgo: '%n hours ago'
```

Hindi (`hi`) values:
```
appName: 'WaterTank'
lookingForDevice: 'आपका डिवाइस ढूँढ रहे हैं...'
connected: 'जुड़ा हुआ'
disconnected: 'जुड़ा नहीं है'
lastUpdated: '%t पहले अपडेट किया गया'
tankLevel: 'टंकी का स्तर'
motorRunning: 'मोटर चल रही है'
motorOff: 'मोटर बंद है'
motorStarting: 'मोटर शुरू हो रही है...'
waterArrived: 'पानी आ गया'
tankFull: 'टंकी भरी हुई है'
pumpManual: 'पंप मैनुअल पर है'
waitingForWater: 'पानी का इंतज़ार है...'
nothingHappening: 'अभी कुछ नहीं हो रहा'
evWaterArrived: 'पानी आ गया'
evMotorOn: 'मोटर शुरू हुई'
evMotorOff: 'मोटर बंद हुई'
evAlreadyFull: 'पानी आया (टंकी पहले से भरी थी)'
evManualOn: 'पंप मैनुअल पर सेट'
evManualOff: 'मैनुअल मोड बंद'
stopTankFull: 'टंकी भर गई'
stopSupplyCut: 'पानी की सप्लाई बंद'
stopAlreadyFull: 'पहले से भरी थी'
records: 'रिकॉर्ड'
today: 'आज'
noEventsToday: 'आज कोई गतिविधि नहीं'
waitingMessage: 'पानी का इंतज़ार है। जब पानी आएगा तब मोटर अपने आप शुरू हो जाएगी।'
noEventsDate: 'इस दिन कोई गतिविधि नहीं'
settings: 'सेटिंग्स'
language: 'भाषा'
notifyMotorOn: 'मोटर शुरू होने पर सूचना दें'
notifyMotorOff: 'मोटर बंद होने पर सूचना दें'
keepRecordsFor: 'रिकॉर्ड कितने दिन रखें'
days30: '30 दिन'
days60: '60 दिन'
days90: '90 दिन'
shareRecords: 'मेरे रिकॉर्ड शेयर करें'
clearAllData: 'सभी रिकॉर्ड मिटाएँ'
clearConfirmTitle: 'सभी रिकॉर्ड मिटाएँ?'
clearConfirmMsg: 'यह आपके पानी और मोटर के सभी रिकॉर्ड हमेशा के लिए मिटा देगा। यह वापस नहीं किया जा सकता।'
deleteAll: 'सब मिटाएँ'
cancel: 'रद्द करें'
cleared: 'हो गया'
deviceInfo: 'डिवाइस'
appVersion: 'ऐप वर्शन'
deviceName: 'WaterTank'
aboutTitle: 'के बारे में'
ob1Title: 'आपकी टंकी, हमेशा निगरानी में'
ob1Subtitle: 'जब गाँव का पानी आता है, यह ऐप अपने आप मोटर शुरू और बंद करता है।'
ob2Title: 'दिन हो या रात, अपने आप काम करता है'
ob2Subtitle: 'जब पंचायत का पानी आता है, मोटर अपने आप शुरू हो जाती है। टंकी भरने पर या पानी बंद होने पर रुक जाती है।'
ob3Title: 'अपनी भाषा चुनें'
ob3Subtitle: 'आप इसे बाद में सेटिंग्स में बदल सकते हैं।'
getStarted: 'शुरू करें'
next: 'आगे'
tabDashboard: 'मुख्य'
tabRecords: 'रिकॉर्ड'
tabSettings: 'सेटिंग्स'
justNow: 'अभी'
minuteAgo: '1 मिनट पहले'
minutesAgo: '%n मिनट पहले'
hourAgo: '1 घंटा पहले'
hoursAgo: '%n घंटे पहले'
```

Marathi (`mr`) values:
```
appName: 'WaterTank'
lookingForDevice: 'तुमचे डिव्हाइस शोधत आहोत...'
connected: 'जोडलेले'
disconnected: 'जोडलेले नाही'
lastUpdated: '%t पूर्वी अपडेट केले'
tankLevel: 'टाकीची पातळी'
motorRunning: 'मोटर चालू आहे'
motorOff: 'मोटर बंद आहे'
motorStarting: 'मोटर सुरू होत आहे...'
waterArrived: 'पाणी आले'
tankFull: 'टाकी भरली आहे'
pumpManual: 'पंप मॅन्युअल वर आहे'
waitingForWater: 'पाण्याची वाट पाहत आहे...'
nothingHappening: 'सध्या काहीही होत नाही'
evWaterArrived: 'पाणी आले'
evMotorOn: 'मोटर सुरू झाली'
evMotorOff: 'मोटर बंद झाली'
evAlreadyFull: 'पाणी आले (टाकी आधीच भरली होती)'
evManualOn: 'पंप मॅन्युअल वर सेट'
evManualOff: 'मॅन्युअल मोड बंद'
stopTankFull: 'टाकी भरली'
stopSupplyCut: 'पाणी पुरवठा बंद'
stopAlreadyFull: 'आधीच भरली होती'
records: 'नोंदी'
today: 'आज'
noEventsToday: 'आज काहीही नोंद नाही'
waitingMessage: 'पाण्याची वाट पाहत आहे. पाणी आल्यावर मोटर आपोआप सुरू होईल.'
noEventsDate: 'या दिवशी काहीही नोंद नाही'
settings: 'सेटिंग्ज'
language: 'भाषा'
notifyMotorOn: 'मोटर सुरू झाल्यावर सूचना द्या'
notifyMotorOff: 'मोटर बंद झाल्यावर सूचना द्या'
keepRecordsFor: 'नोंदी किती दिवस ठेवायच्या'
days30: '30 दिवस'
days60: '60 दिवस'
days90: '90 दिवस'
shareRecords: 'माझ्या नोंदी शेअर करा'
clearAllData: 'सर्व नोंदी मिटवा'
clearConfirmTitle: 'सर्व नोंदी मिटवायच्या?'
clearConfirmMsg: 'हे तुमच्या पाण्याच्या आणि मोटरच्या सर्व नोंदी कायमचे मिटवेल. हे परत आणता येणार नाही.'
deleteAll: 'सर्व मिटवा'
cancel: 'रद्द करा'
cleared: 'झाले'
deviceInfo: 'डिव्हाइस'
appVersion: 'अ‍ॅप आवृत्ती'
deviceName: 'WaterTank'
aboutTitle: 'बद्दल'
ob1Title: 'तुमची टाकी, सतत लक्षात'
ob1Subtitle: 'गावाचे पाणी आल्यावर हे अ‍ॅप आपोआप मोटर सुरू आणि बंद करते.'
ob2Title: 'दिवस असो वा रात्र, आपोआप काम करते'
ob2Subtitle: 'पंचायतीचे पाणी आल्यावर मोटर आपोआप सुरू होते. टाकी भरल्यावर किंवा पाणी संपल्यावर थांबते.'
ob3Title: 'तुमची भाषा निवडा'
ob3Subtitle: 'तुम्ही नंतर सेटिंग्जमध्ये हे बदलू शकता.'
getStarted: 'सुरू करा'
next: 'पुढे'
tabDashboard: 'मुख्य'
tabRecords: 'नोंदी'
tabSettings: 'सेटिंग्ज'
justNow: 'आत्ताच'
minuteAgo: '1 मिनिट पूर्वी'
minutesAgo: '%n मिनिटे पूर्वी'
hourAgo: '1 तास पूर्वी'
hoursAgo: '%n तास पूर्वी'
```

Kannada (`kn`) values:
```
appName: 'WaterTank'
lookingForDevice: 'ನಿಮ್ಮ ಸಾಧನವನ್ನು ಹುಡುಕುತ್ತಿದೆ...'
connected: 'ಸಂಪರ್ಕಗೊಂಡಿದೆ'
disconnected: 'ಸಂಪರ್ಕವಿಲ್ಲ'
lastUpdated: '%t ಮೊದಲು ನವೀಕರಿಸಲಾಗಿದೆ'
tankLevel: 'ಟ್ಯಾಂಕ್ ಮಟ್ಟ'
motorRunning: 'ಮೋಟಾರ್ ಚಾಲನೆಯಲ್ಲಿದೆ'
motorOff: 'ಮೋಟಾರ್ ಆಫ್ ಆಗಿದೆ'
motorStarting: 'ಮೋಟಾರ್ ಪ್ರಾರಂಭವಾಗುತ್ತಿದೆ...'
waterArrived: 'ನೀರು ಬಂದಿದೆ'
tankFull: 'ಟ್ಯಾಂಕ್ ತುಂಬಿದೆ'
pumpManual: 'ಪಂಪ್ ಕೈಯಿಂದ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ'
waitingForWater: 'ನೀರಿಗಾಗಿ ಕಾಯುತ್ತಿದೆ...'
nothingHappening: 'ಈಗ ಏನೂ ನಡೆಯುತ್ತಿಲ್ಲ'
evWaterArrived: 'ನೀರು ಬಂದಿದೆ'
evMotorOn: 'ಮೋಟಾರ್ ಪ್ರಾರಂಭವಾಯಿತು'
evMotorOff: 'ಮೋಟಾರ್ ನಿಂತಿತು'
evAlreadyFull: 'ನೀರು ಬಂದಿದೆ (ಟ್ಯಾಂಕ್ ಈಗಾಗಲೇ ತುಂಬಿತ್ತು)'
evManualOn: 'ಪಂಪ್ ಕೈಯಿಂದ ಸೆಟ್ ಮಾಡಲಾಗಿದೆ'
evManualOff: 'ಕೈ ಮೋಡ್ ಆಫ್ ಆಗಿದೆ'
stopTankFull: 'ಟ್ಯಾಂಕ್ ತುಂಬಿದೆ'
stopSupplyCut: 'ನೀರಿನ ಪೂರೈಕೆ ನಿಂತಿತು'
stopAlreadyFull: 'ಈಗಾಗಲೇ ತುಂಬಿತ್ತು'
records: 'ದಾಖಲೆಗಳು'
today: 'ಇಂದು'
noEventsToday: 'ಇಂದು ಯಾವುದೇ ಘಟನೆಗಳಿಲ್ಲ'
waitingMessage: 'ನೀರಿಗಾಗಿ ಕಾಯುತ್ತಿದೆ. ನೀರು ಬಂದಾಗ ಮೋಟಾರ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ.'
noEventsDate: 'ಈ ದಿನ ಯಾವುದೇ ಘಟನೆಗಳಿಲ್ಲ'
settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು'
language: 'ಭಾಷೆ'
notifyMotorOn: 'ಮೋಟಾರ್ ಪ್ರಾರಂಭವಾದಾಗ ಸೂಚಿಸಿ'
notifyMotorOff: 'ಮೋಟಾರ್ ನಿಂತಾಗ ಸೂಚಿಸಿ'
keepRecordsFor: 'ದಾಖಲೆಗಳನ್ನು ಎಷ್ಟು ದಿನ ಇಡಬೇಕು'
days30: '30 ದಿನಗಳು'
days60: '60 ದಿನಗಳು'
days90: '90 ದಿನಗಳು'
shareRecords: 'ನನ್ನ ದಾಖಲೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ'
clearAllData: 'ಎಲ್ಲಾ ದಾಖಲೆಗಳನ್ನು ಅಳಿಸಿ'
clearConfirmTitle: 'ಎಲ್ಲಾ ದಾಖಲೆಗಳನ್ನು ಅಳಿಸಬೇಕೇ?'
clearConfirmMsg: 'ಇದು ನಿಮ್ಮ ನೀರಿನ ಪೂರೈಕೆ ಮತ್ತು ಮೋಟಾರ್ ದಾಖಲೆಗಳನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸುತ್ತದೆ. ಇದನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗದು.'
deleteAll: 'ಎಲ್ಲವನ್ನೂ ಅಳಿಸಿ'
cancel: 'ರದ್ದು'
cleared: 'ಮುಗಿಯಿತು'
deviceInfo: 'ಸಾಧನ'
appVersion: 'ಆ್ಯಪ್ ಆವೃತ್ತಿ'
deviceName: 'WaterTank'
aboutTitle: 'ಬಗ್ಗೆ'
ob1Title: 'ನಿಮ್ಮ ಟ್ಯಾಂಕ್, ಯಾವಾಗಲೂ ಗಮನದಲ್ಲಿ'
ob1Subtitle: 'ಗ್ರಾಮದ ನೀರು ಬಂದಾಗ ಈ ಆ್ಯಪ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಮೋಟಾರ್ ಪ್ರಾರಂಭಿಸುತ್ತದೆ ಮತ್ತು ನಿಲ್ಲಿಸುತ್ತದೆ.'
ob2Title: 'ಹಗಲು ರಾತ್ರಿ, ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ'
ob2Subtitle: 'ಪಂಚಾಯತಿ ನೀರು ಬಂದಾಗ ಮೋಟಾರ್ ಸ್ವತಃ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಟ್ಯಾಂಕ್ ತುಂಬಿದಾಗ ಅಥವಾ ನೀರು ನಿಂತಾಗ ಅದು ನಿಲ್ಲುತ್ತದೆ.'
ob3Title: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ'
ob3Subtitle: 'ನೀವು ಇದನ್ನು ನಂತರ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಬದಲಾಯಿಸಬಹುದು.'
getStarted: 'ಪ್ರಾರಂಭಿಸಿ'
next: 'ಮುಂದೆ'
tabDashboard: 'ಮುಖ್ಯ'
tabRecords: 'ದಾಖಲೆಗಳು'
tabSettings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು'
justNow: 'ಈಗ'
minuteAgo: '1 ನಿಮಿಷ ಮೊದಲು'
minutesAgo: '%n ನಿಮಿಷಗಳ ಮೊದಲು'
hourAgo: '1 ಗಂಟೆ ಮೊದಲು'
hoursAgo: '%n ಗಂಟೆಗಳ ಮೊದಲು'
```

This is a NEW file — make sure the file is non-empty after creation. Do not import from anywhere; this is a pure data module. Export only the type `Lang`, the interface `Translations`, and the const `TRANSLATIONS`.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-032: [TODO] Create LanguageContext
**Files:** `context/LanguageContext.tsx`
**Model:** local
**Message:**
Create a new file `context/LanguageContext.tsx` that provides a React Context for the active language.

Exact code structure:
```tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Lang, TRANSLATIONS, Translations } from '@/constants/i18n';

const STORAGE_KEY = '@watertank_language';

interface LanguageContextValue {
  lang: Lang;
  setLanguage: (l: Lang) => void;
  t: (key: keyof Translations) => string;
  ready: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'hi' || saved === 'mr' || saved === 'kn') {
          setLang(saved);
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const setLanguage = useCallback((l: Lang) => {
    setLang(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback(
    (key: keyof Translations): string => {
      const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
      return dict[key] ?? TRANSLATIONS.en[key] ?? String(key);
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}
```

Write this code exactly as above. Do not add extra logic. Verify the file is non-empty.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-033: [TODO] Update Event model labels and add HIDDEN_EVENT_TYPES
**Files:** `models/Event.ts`
**Model:** local
**Message:**
Modify `models/Event.ts`. KEEP all existing exports — `EventType`, `StopReason`, `WaterEvent`, `DeviceState`, `DailyStats`, `EVENT_LABELS`, `STOP_REASON_LABELS`, `PUMP_STATE_LABELS`, `DEFAULT_DEVICE_STATE`. Do not change any field name.

Only two changes:

1. Update `EVENT_LABELS` to use friendly plain English (it will be re-translated at render time via t()):
```ts
export const EVENT_LABELS: Record<EventType, string> = {
  [EventType.WATER_ARRIVED]: 'Water Arrived',
  [EventType.MOTOR_ON]: 'Motor Started',
  [EventType.MOTOR_OFF]: 'Motor Stopped',
  [EventType.ALREADY_FULL]: 'Water Arrived (tank was already full)',
  [EventType.MANUAL_ON]: 'Pump set to manual',
  [EventType.MANUAL_OFF]: 'Manual mode turned off',
  [EventType.BLE_SYNCED]: 'Synced to Phone',
};
```

2. Update `STOP_REASON_LABELS`:
```ts
export const STOP_REASON_LABELS: Record<StopReason, string> = {
  [StopReason.NONE]: '—',
  [StopReason.TANK_FULL]: 'Tank Full',
  [StopReason.SUPPLY_CUT]: 'Water supply ended',
  [StopReason.ALREADY_FULL]: 'Already full',
};
```

3. ADD a new export at the end of the file:
```ts
export const HIDDEN_EVENT_TYPES: EventType[] = [EventType.BLE_SYNCED];
```

Do NOT touch the WaterEvent interface. Do NOT rename `tankPct`, `flowLpm`, `epoch`, `durationSec`, `stopReason`, or `synced`.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-034: [TODO] Update formatters (12-hour time, no decimals)
**Files:** `utils/formatters.ts`
**Model:** local
**Message:**
Modify `utils/formatters.ts`. Keep all existing function names exported. Do not remove any function. Only make these changes:

1. `formatTime(epoch)`: switch to 12-hour AM/PM, NO seconds:
```ts
export function formatTime(epoch: number): string {
  if (!epoch || epoch < 1000000) return 'Time unknown';
  const d = new Date(epoch * 1000);
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
```
Output examples: "6:43 AM", "10:15 PM". NO seconds.

2. ADD a new exported function `formatTankPct`:
```ts
export function formatTankPct(pct: number): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '—';
  return `${Math.round(pct)}%`;
}
```
Used everywhere tank percentages are shown. Replaces `.toFixed(1)` calls.

3. `formatRelativeTime(epoch)`: keep the same signature but use whole minutes (no decimals) and English defaults:
```ts
export function formatRelativeTime(epoch: number | null): string {
  if (!epoch) return 'never';
  const diff = Math.floor(Date.now() / 1000) - epoch;
  if (diff < 60) return 'just now';
  if (diff < 120) return '1 min ago';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 7200) return '1 hour ago';
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
```

4. `getTankColor(pct, theme)`: change to use the new blue palette. Tank full = BLUE, not red.
```ts
export function getTankColor(
  pct: number,
  theme: { tankEmpty: string; tankLow: string; tankMid: string; tankHigh: string; tankFull: string },
): string {
  if (pct >= 95) return theme.tankFull;
  if (pct >= 60) return theme.tankHigh;
  if (pct >= 30) return theme.tankMid;
  if (pct >= 10) return theme.tankLow;
  return theme.tankEmpty;
}
```

5. Keep `formatDate`, `formatShortDate`, `formatDayLabel`, `formatDuration`, `getDayBounds`, `addDays`, `isToday`, `formatHeaderDate` UNCHANGED.

6. Remove no functions. Do not change the file's other contents.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-035: [TODO] Create WaterTankWidget component (SVG cylinder)
**Files:** `components/WaterTankWidget.tsx`
**Model:** local
**Message:**
Create a NEW file `components/WaterTankWidget.tsx`. This component replaces `TankLevelBar` and shows a 3D-looking cylindrical water tank using `react-native-svg`. Do not import from `TankLevelBar`. Write from scratch.

Exact code (write this verbatim):
```tsx
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { formatTankPct, getTankColor } from '@/utils/formatters';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface WaterTankWidgetProps {
  pct: number;
  connected: boolean;
  animated?: boolean;
}

const TANK_W = 140;
const TANK_H = 220;
const TANK_X = 10;
const TANK_Y = 20;
const INNER_W = TANK_W - 20;
const INNER_H = TANK_H - 40;
const ELLIPSE_RY = 12;

export function WaterTankWidget({ pct, connected, animated = true }: WaterTankWidgetProps) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(100, pct));
  const fillPct = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      fillPct.value = withTiming(clamped, { duration: 600 });
    } else {
      fillPct.value = clamped;
    }
  }, [clamped, animated]);

  const waterColor = getTankColor(clamped, colors);

  const animatedRectProps = useAnimatedProps(() => {
    const h = (fillPct.value / 100) * INNER_H;
    return {
      y: TANK_Y + (INNER_H - h),
      height: h,
    } as any;
  });

  const animatedEllipseProps = useAnimatedProps(() => {
    const h = (fillPct.value / 100) * INNER_H;
    return {
      cy: TANK_Y + (INNER_H - h),
    } as any;
  });

  if (!connected) {
    return (
      <View style={styles.container}>
        <Svg width={TANK_W + 20} height={TANK_H + 20}>
          <Rect
            x={TANK_X}
            y={TANK_Y}
            width={INNER_W}
            height={INNER_H}
            rx={8}
            fill={colors.muted}
            stroke={colors.border}
            strokeWidth={2}
          />
          <Ellipse
            cx={TANK_X + INNER_W / 2}
            cy={TANK_Y}
            rx={INNER_W / 2}
            ry={ELLIPSE_RY}
            fill={colors.muted}
            stroke={colors.border}
            strokeWidth={2}
          />
        </Svg>
        <Text style={[styles.bigPct, { color: colors.mutedForeground }]}>—</Text>
        <Text style={[styles.subText, { color: colors.mutedForeground }]}>No data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={TANK_W + 20} height={TANK_H + 20}>
        <Defs>
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={waterColor} stopOpacity="0.95" />
            <Stop offset="1" stopColor={waterColor} stopOpacity="0.65" />
          </LinearGradient>
        </Defs>

        {/* Tank background (empty interior) */}
        <Rect
          x={TANK_X}
          y={TANK_Y}
          width={INNER_W}
          height={INNER_H}
          rx={8}
          fill="#0F172A"
          stroke="#334155"
          strokeWidth={2}
        />

        {/* Water fill (animated rect from bottom up) */}
        <AnimatedRect
          x={TANK_X}
          width={INNER_W}
          rx={8}
          fill="url(#waterGrad)"
          animatedProps={animatedRectProps}
        />

        {/* Water surface ellipse (top of water) */}
        {clamped > 1 && (
          <AnimatedEllipse
            cx={TANK_X + INNER_W / 2}
            rx={INNER_W / 2}
            ry={ELLIPSE_RY * 0.6}
            fill={waterColor}
            animatedProps={animatedEllipseProps}
          />
        )}

        {/* Tank top ellipse (rim) */}
        <Ellipse
          cx={TANK_X + INNER_W / 2}
          cy={TANK_Y}
          rx={INNER_W / 2}
          ry={ELLIPSE_RY}
          fill="none"
          stroke="#334155"
          strokeWidth={2}
        />
      </Svg>

      <Text style={[styles.bigPct, { color: waterColor }]}>{formatTankPct(clamped)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  bigPct: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1.5,
  },
  subText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
});
```

Verify the file is non-empty after creation. Do not add extra imports.

Note: `getTankColor` in `utils/formatters.ts` now expects `{ tankEmpty, tankLow, tankMid, tankHigh, tankFull }` — those keys exist on the color palette after TASK-030.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-036: [TODO] Update StatusDot to use translations
**Files:** `components/StatusDot.tsx`
**Model:** local
**Message:**
Modify `components/StatusDot.tsx`. Keep the same component name (`StatusDot`), props, and animation logic. Only change the hardcoded English strings to translated strings.

Add this import at the top with the others:
```ts
import { useLanguage } from '@/context/LanguageContext';
```

Inside the component, after `const colors = useColors();`, add:
```ts
const { t } = useLanguage();
```

Replace the existing `label` derivation:
```ts
const label = connected
  ? simMode
    ? 'Simulating'
    : t('connected')
  : t('lookingForDevice');
```

Replace the sync time text:
```tsx
{connected && lastSyncAt && (
  <Text style={[styles.syncTime, { color: colors.mutedForeground }]}>
    {t('lastUpdated').replace('%t', formatRelativeTime(lastSyncAt))}
  </Text>
)}
```

Keep the existing animation logic (withRepeat / withSequence / withTiming), styles object, simBadge rendering — all unchanged. Keep the existing `formatRelativeTime` import.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-037: [TODO] Update EventRow — hide BLE_SYNCED, 12h time, rounded tank%
**Files:** `components/EventRow.tsx`
**Model:** local
**Message:**
Modify `components/EventRow.tsx`. Keep the component shape and styling but make 3 changes:

1. Add `HIDDEN_EVENT_TYPES` to the existing import from `@/models/Event`:
```ts
import {
  EventType,
  StopReason,
  WaterEvent,
  EVENT_LABELS,
  STOP_REASON_LABELS,
  HIDDEN_EVENT_TYPES,
} from '@/models/Event';
```

2. Add the `formatTankPct` import:
```ts
import { formatTime, formatDuration, formatTankPct } from '@/utils/formatters';
```

3. At the very top of `EventRow` function body (before any other logic), add:
```ts
if (HIDDEN_EVENT_TYPES.includes(event.type)) return null;
```

4. Replace this existing line:
```ts
const tankStr = `${event.tankPct.toFixed(1)}%`;
```
with:
```ts
const tankStr = formatTankPct(event.tankPct);
```

Do not change anything else. `formatTime` already shows 12-hour AM/PM after TASK-034. Field names (`event.type`, `event.tankPct`, `event.epoch`, `event.stopReason`, `event.durationSec`) are correct as-is — don't rename them.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-038: [TODO] Create combined Records screen
**Files:** `app/(tabs)/records.tsx`
**Model:** local
**Message:**
Create a NEW file `app/(tabs)/records.tsx`. This single screen replaces the previous `today.tsx`, `history.tsx`, and `stats.tsx` (which will be deleted in TASK-041).

Layout:
- Top: date navigation row — left chevron, centered date label ("Today" if today, otherwise "Wed, 21 May"), right chevron (disabled when on today).
- Below: FlatList of `EventRow` for the selected date.
- Pull-to-refresh.
- Empty state via `EmptyState` component.
- Sticky bottom summary bar (only when viewing today): "Motor ran X times today" or "No motor runs today".

Exact code:
```tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { EmptyState } from '@/components/EmptyState';
import { EventRow } from '@/components/EventRow';
import { useDevice } from '@/context/DeviceContext';
import { useLanguage } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';
import { EventType, WaterEvent } from '@/models/Event';
import {
  addDays,
  formatHeaderDate,
  isToday,
} from '@/utils/formatters';

export default function RecordsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { getEventsForDate, refreshKey } = useDevice();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [internalKey, setInternalKey] = useState(0);

  const events: WaterEvent[] = getEventsForDate(currentDate);
  const atToday = isToday(currentDate);
  const dateLabel = atToday ? t('today') : formatHeaderDate(currentDate);

  const motorRuns = useMemo(
    () => events.filter((e) => e.type === EventType.MOTOR_OFF && e.durationSec > 0).length,
    [events],
  );

  function goBack() {
    setCurrentDate((d) => addDays(d, -1));
  }
  function goForward() {
    if (!atToday) setCurrentDate((d) => addDays(d, 1));
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInternalKey((k) => k + 1);
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.arrowBtn} activeOpacity={0.6}>
          <Feather name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.dateLabel, { color: colors.foreground }]}>{dateLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={goForward}
          style={styles.arrowBtn}
          activeOpacity={atToday ? 1 : 0.6}
          disabled={atToday}
        >
          <Feather
            name="chevron-right"
            size={24}
            color={atToday ? colors.mutedForeground : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        key={`${currentDate.toDateString()}-${refreshKey}-${internalKey}`}
        data={events}
        keyExtractor={(item) => `${item.id}-${item.epoch}`}
        renderItem={({ item }) => <EventRow event={item} />}
        contentContainerStyle={styles.listContent}
        scrollEnabled={events.length > 0}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={atToday ? 'clock' : 'calendar'}
            title={atToday ? t('noEventsToday') : t('noEventsDate')}
            message={atToday ? t('waitingMessage') : ''}
          />
        }
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  arrowBtn: {
    padding: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 84,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
```

Note: `getEventsForDate` from `DeviceContext` returns `WaterEvent[]` already filtered by day. Do not call `getEventsForDay` directly. Field names: `event.epoch`, `event.tankPct`, `event.durationSec`, `event.type`. Verify file is non-empty.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-039: [TODO] Update Dashboard — WaterTankWidget, friendly labels, remove Pump State card
**Files:** `app/(tabs)/index.tsx`
**Model:** local
**Message:**
Modify `app/(tabs)/index.tsx`. Several changes to the existing `DashboardScreen` — keep the file's overall structure (scrollview + status dot + cards) but:

1. Replace this import:
```ts
import { TankLevelBar } from "@/components/TankLevelBar";
```
with:
```ts
import { WaterTankWidget } from '@/components/WaterTankWidget';
```

2. Remove this import (no longer needed):
```ts
import { PUMP_STATE_LABELS } from "@/models/Event";
```

3. Add this import:
```ts
import { useLanguage } from '@/context/LanguageContext';
```

4. Inside `DashboardScreen()`, after `const colors = useColors();`, add:
```ts
const { t } = useLanguage();
```

5. Delete the variable `pumpStateLabel` (the line `const pumpStateLabel = PUMP_STATE_LABELS[deviceState.pumpState] ?? "Unknown";`). Not used after this task.

6. Delete the entire `simDone` banner JSX block — everything from `{simDone && (` to its matching closing `)}` inclusive. Also delete the `simDone, dismissSimDone` destructured properties from `useDevice()` call. Replace this line:
```ts
const { deviceState, simMode, simDone, dismissSimDone } = useDevice();
```
with:
```ts
const { deviceState, simMode } = useDevice();
```

7. Replace the `<TankLevelBar pct={deviceState.tank} connected={deviceState.connected} />` JSX with:
```tsx
<WaterTankWidget pct={deviceState.tank} connected={deviceState.connected} />
```

8. Replace the manual override banner text. Find:
```tsx
<Text style={styles.manualBannerText}>⚠ MANUAL OVERRIDE ACTIVE</Text>
```
Replace with:
```tsx
<Text style={styles.manualBannerText}>{t('pumpManual')}</Text>
```

9. Replace the disconnected card text. Find this block:
```tsx
<Text style={[styles.disconnectedTitle, { color: colors.mutedForeground }]}>
  {simMode ? "Demo running…" : "Waiting for WaterTank device"}
</Text>
{!simMode && (
  <Text style={[styles.disconnectedSub, { color: colors.mutedForeground }]}>
    Go to Settings → Run Demo to test without hardware
  </Text>
)}
```
Replace with:
```tsx
<Text style={[styles.disconnectedTitle, { color: colors.mutedForeground }]}>
  {simMode ? 'Demo running…' : t('lookingForDevice')}
</Text>
{!simMode && (
  <Text style={[styles.disconnectedSub, { color: colors.mutedForeground }]}>
    {t('waitingForWater')}
  </Text>
)}
```

Also change the condition `{!deviceState.connected && !simDone && (` to `{!deviceState.connected && (` (since simDone is removed).

10. Replace the motor card text. Find:
```tsx
<Text style={[styles.motorLabel, { color: colors.foreground }]}>
  Motor: {deviceState.motorOn ? "RUNNING" : "OFF"}
</Text>
{isStartupDelay && (
  <Text style={[styles.motorSub, { color: colors.mutedForeground }]}>
    Air Purge: {countdown}s remaining
  </Text>
)}
```
Replace with:
```tsx
<Text style={[styles.motorLabel, { color: colors.foreground }]}>
  {deviceState.motorOn ? t('motorRunning') : t('motorOff')}
</Text>
{isStartupDelay && (
  <Text style={[styles.motorSub, { color: colors.mutedForeground }]}>
    {t('motorStarting')} {countdown}s
  </Text>
)}
```

11. DELETE the entire "Pump State" stateCard JSX block — everything from:
```tsx
{deviceState.connected && (
  <View style={[styles.stateCard, ...
```
through its closing `)}`. Remove the corresponding `stateCard`, `stateLabel`, `stateValue` style entries from the `StyleSheet.create` block. Also remove `doneCard`, `doneCardInner`, `doneTitle`, `doneSub`, `doneDismiss` styles since simDone banner is gone.

12. Keep `StatusDot`, `useDevice`, `useColors` imports, animation logic with `countdown` and `setInterval`, manual banner JSX, motor card JSX, and all working state intact.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-040: [TODO] Update Settings — language picker, hide DEBUG, friendly labels
**Files:** `app/(tabs)/settings.tsx`
**Model:** local
**Message:**
Modify `app/(tabs)/settings.tsx`. Keep `SectionHeader`, `SettingRow`, `ActionRow` helper components unchanged. Make these changes to `SettingsScreen`:

1. Add these imports:
```ts
import { useLanguage } from '@/context/LanguageContext';
import { Lang } from '@/constants/i18n';
```

2. Inside `SettingsScreen()`, after `const colors = useColors();`, add:
```ts
const { t, lang, setLanguage } = useLanguage();
```

3. ADD a `useState` for the secret dev-mode tap counter and a state for showing the developer/BLE section:
```ts
const [versionTaps, setVersionTaps] = useState(0);
const [devMode, setDevMode] = useState(false);
```

4. Add a handler for version tap:
```ts
const onVersionTap = useCallback(() => {
  setVersionTaps((n) => {
    const next = n + 1;
    if (next >= 7) {
      setDevMode(true);
      Alert.alert('Developer mode', 'Developer options unlocked.');
      return 0;
    }
    return next;
  });
}, []);
```

5. At the very top of the returned `ScrollView` (BEFORE the existing "NOTIFICATIONS" section), insert a NEW LANGUAGE section:
```tsx
<SectionHeader title={t('language').toUpperCase()} colors={colors} />
<View style={[styles.section, { borderColor: colors.border }]}>
  <View style={[styles.row, { borderBottomColor: 'transparent', backgroundColor: colors.card, flexWrap: 'wrap', gap: 8 }]}>
    {(['en', 'hi', 'mr', 'kn'] as Lang[]).map((code) => {
      const labels: Record<Lang, string> = { en: 'English', hi: 'हिन्दी', mr: 'मराठी', kn: 'ಕನ್ನಡ' };
      const active = lang === code;
      return (
        <TouchableOpacity
          key={code}
          onPress={() => setLanguage(code)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 18,
            backgroundColor: active ? colors.primary : colors.muted,
          }}
        >
          <Text style={{
            color: active ? colors.primaryForeground : colors.foreground,
            fontFamily: 'Inter_500Medium',
            fontSize: 14,
          }}>{labels[code]}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
```

6. Change `<SectionHeader title="NOTIFICATIONS" .../>` → keep "NOTIFICATIONS" hardcoded uppercase since section headers are visual. For SettingRow labels:
- `label="Motor started"` → `label={t('notifyMotorOn')}`
- `label="Motor stopped"` → `label={t('notifyMotorOff')}`
- Delete the entire third SettingRow with `label="Manual override"` and its switch (no longer surfaced to users).

7. In the DATA section:
- `<Text ...>Retention period</Text>` → `<Text ...>{t('keepRecordsFor')}</Text>`
- DELETE the entire row that shows `label="Events stored"` and its value.
- DELETE the entire conditional `{dbInfo.oldestEpoch && (...)}` block that shows the oldest event row.
- `<ActionRow label="Export data (CSV)" .../>` → `<ActionRow label={t('shareRecords')} .../>` (keep its handler).
- DELETE the `<ActionRow label="Sync now" ... />` entirely.
- `<ActionRow label="Clear all data" .../>` → `<ActionRow label={t('clearAllData')} .../>`

8. Update the clear data Alert to use translations:
```ts
const handleClearData = useCallback(() => {
  Alert.alert(
    t('clearConfirmTitle'),
    t('clearConfirmMsg'),
    [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteAll'),
        style: 'destructive',
        onPress: () => {
          clearData();
          Alert.alert(t('cleared'));
        },
      },
    ],
  );
}, [clearData, t]);
```

9. WRAP the entire existing "DEBUG" section (from `<SectionHeader title="DEBUG" ...` through the closing `</View>` of that section's `<View style={[styles.section, ...]}>`) in a conditional:
```tsx
{devMode && (
  <>
    <SectionHeader title="DEBUG" colors={colors} />
    <View style={[styles.section, { borderColor: colors.border }]}>
      ... (the existing debug section JSX unchanged)
    </View>
  </>
)}
```

10. In the ABOUT section:
- Change section header title text: `<SectionHeader title="ABOUT" .../>` → keep "ABOUT" hardcoded uppercase.
- Change `<Text ...>App version</Text>` → `<Text ...>{t('appVersion')}</Text>`.
- Make the version VALUE tappable (secret 7-tap dev mode). Replace this row:
```tsx
<View style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
  <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>App version</Text>
  <Text style={[styles.rowValue, { color: colors.foreground }]}>{appVersion}</Text>
</View>
```
with:
```tsx
<TouchableOpacity
  style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
  onPress={onVersionTap}
  activeOpacity={1}
>
  <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{t('appVersion')}</Text>
  <Text style={[styles.rowValue, { color: colors.foreground }]}>{appVersion}</Text>
</TouchableOpacity>
```
- DELETE the existing "Device" row showing "WaterTank v3 (ESP32)" entirely.

11. Do NOT touch the `handleExport` function logic — only its label.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-041: [TODO] Reduce to 3 tabs and delete old tab files
**Files:** `app/(tabs)/_layout.tsx` `app/(tabs)/today.tsx` `app/(tabs)/history.tsx` `app/(tabs)/stats.tsx`
**Model:** local
**Message:**
Two things to do:

A) **Delete** the contents of `app/(tabs)/today.tsx`, `app/(tabs)/history.tsx`, and `app/(tabs)/stats.tsx`. Replace each with this single line so Expo Router does not error:
```tsx
export default function Removed() { return null; }
```
(These files exist on disk; emptying them is acceptable. The new `records.tsx` from TASK-038 replaces them.)

B) **Rewrite** `app/(tabs)/_layout.tsx` so the Tabs bar has exactly THREE tabs in this order: Dashboard (index), Records (records), Settings (settings). Use the exact code below — preserve the existing BlurView / iOS handling:

```tsx
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';

import { useColors } from '@/hooks/useColors';

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 0,
          elevation: 0,
          ...(Platform.OS === 'web' ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_500Medium',
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'WaterTank',
          tabBarIcon: ({ color, size }) => <Feather name="droplet" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, size }) => <Feather name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="today" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="stats" options={{ href: null }} />
    </Tabs>
  );
}
```

The `href: null` entries hide the now-stub today/history/stats files from the tab bar without requiring file deletion.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-042: [TODO] Create Onboarding screen
**Files:** `app/onboarding.tsx`
**Model:** local
**Message:**
Create a NEW file `app/onboarding.tsx`. 3-page onboarding shown only on first launch. Page 1 introduces the app, Page 2 explains it works automatically, Page 3 picks the language and finishes setup.

Exact code:
```tsx
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { Lang } from '@/constants/i18n';
import { useLanguage } from '@/context/LanguageContext';
import { useColors } from '@/hooks/useColors';

const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  hi: 'हिन्दी',
  mr: 'मराठी',
  kn: 'ಕನ್ನಡ',
};

export default function OnboardingScreen() {
  const colors = useColors();
  const { t, lang, setLanguage } = useLanguage();
  const [page, setPage] = useState(0);

  async function finish() {
    try {
      await AsyncStorage.setItem('onboarding_done', '1');
    } catch {}
    router.replace('/(tabs)');
  }

  function next() {
    if (page < 2) setPage((p) => p + 1);
    else finish();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.body}>
        {page === 0 && (
          <View style={styles.pageContent}>
            <Text style={styles.bigIcon}>💧</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob1Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob1Subtitle')}</Text>
          </View>
        )}
        {page === 1 && (
          <View style={styles.pageContent}>
            <Text style={styles.bigIcon}>⚡</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob2Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob2Subtitle')}</Text>
          </View>
        )}
        {page === 2 && (
          <View style={styles.pageContent}>
            <Text style={styles.bigIcon}>🌐</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ob3Title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('ob3Subtitle')}</Text>
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
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? colors.primary : colors.muted },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={next}
          style={[styles.cta, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
            {page === 2 ? t('getStarted') : t('next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  body: { flex: 1, justifyContent: 'center' },
  pageContent: {
    alignItems: 'center',
    gap: 18,
  },
  bigIcon: {
    fontSize: 88,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 16,
  },
  langChip: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 130,
    alignItems: 'center',
  },
  langChipText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    gap: 16,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cta: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
});
```

Verify the file is non-empty. Do not add other imports beyond these.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

## TASK-043: [TODO] Wire onboarding gate and LanguageProvider into root layout
**Files:** `app/_layout.tsx`
**Model:** local
**Message:**
Modify `app/_layout.tsx`. Goal: wrap the app with `LanguageProvider`, register the new `onboarding` route, and route the user to onboarding on first launch.

Replace the entire file with this code (preserves font loading, error boundary, gesture/keyboard/safe-area providers):

```tsx
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DeviceProvider } from '@/context/DeviceContext';
import { LanguageProvider } from '@/context/LanguageContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem('onboarding_done');
        if (done !== '1') {
          // Defer navigation until layout is mounted
          setTimeout(() => router.replace('/onboarding'), 0);
        }
      } catch {}
      setChecked(true);
    })();
  }, []);

  if (!checked) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <DeviceProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <OnboardingGate>
                  <RootLayoutNav />
                </OnboardingGate>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </DeviceProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
```

Key things to preserve:
- `SplashScreen.preventAutoHideAsync()` at the top.
- `useFonts` and the `fontsLoaded || fontError` gating.
- `ErrorBoundary` wrapping.
- `DeviceProvider`, `GestureHandlerRootView`, `KeyboardProvider`, `SafeAreaProvider` are all still present.
- New: `LanguageProvider` wraps `DeviceProvider`.
- New: `OnboardingGate` redirects to `/onboarding` if `AsyncStorage` key `onboarding_done` is not `'1'`.
- New: `Stack.Screen name="onboarding"` registered.

Verify file is non-empty.

WaterEvent field names (never deviate): id, epoch, type, tankPct, flowLpm, stopReason, durationSec, synced
---END-MESSAGE---

---

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
  en: {
    appName: 'WaterTank',
    lookingForDevice: 'Looking for your device...',
    connected: 'Connected',
    disconnected: 'Not connected',
    lastUpdated: 'Updated %t ago',
    tankLevel: 'Tank Level',
    motorRunning: 'Motor Running',
    motorOff: 'Motor is Off',
    motorStarting: 'Motor starting...',
    waterArrived: 'Water Arrived',
    tankFull: 'Tank Full',
    pumpManual: 'Pump Set to Manual',
    waitingForWater: 'Waiting for water...',
    nothingHappening: 'Nothing happening right now',
    evWaterArrived: 'Water Arrived',
    evMotorOn: 'Motor Started',
    evMotorOff: 'Motor Stopped',
    evAlreadyFull: 'Water Arrived (tank was already full)',
    evManualOn: 'Pump set to manual',
    evManualOff: 'Manual mode turned off',
    stopTankFull: 'Tank Full',
    stopSupplyCut: 'Water supply ended',
    stopAlreadyFull: 'Already full',
    records: 'Records',
    today: 'Today',
    noEventsToday: 'No events today',
    waitingMessage: 'Waiting for water. Motor will start automatically when water arrives.',
    noEventsDate: 'No events on this day',
    settings: 'Settings',
    language: 'Language',
    notifyMotorOn: 'Notify when motor starts',
    notifyMotorOff: 'Notify when motor stops',
    keepRecordsFor: 'How long to keep records',
    days30: '30 days',
    days60: '60 days',
    days90: '90 days',
    shareRecords: 'Share my records',
    clearAllData: 'Delete all records',
    clearConfirmTitle: 'Delete all records?',
    clearConfirmMsg: 'This will permanently delete all your water supply and motor records. This cannot be undone.',
    deleteAll: 'Delete All',
    cancel: 'Cancel',
    cleared: 'Done',
    deviceInfo: 'Device',
    appVersion: 'App Version',
    deviceName: 'WaterTank',
    aboutTitle: 'About',
    ob1Title: 'Your water tank, always watched',
    ob1Subtitle: 'This app automatically starts and stops your motor when village water arrives.',
    ob2Title: 'Works automatically, day or night',
    ob2Subtitle: 'When Panchayat water arrives, the motor starts by itself. It stops when the tank is full or water supply ends.',
    ob3Title: 'Choose your language',
    ob3Subtitle: 'You can change this later in Settings.',
    getStarted: 'Get Started',
    next: 'Next',
    tabDashboard: 'Dashboard',
    tabRecords: 'Records',
    tabSettings: 'Settings',
    justNow: 'just now',
    minuteAgo: '1 min ago',
    minutesAgo: '%n min ago',
    hourAgo: '1 hour ago',
    hoursAgo: '%n hours ago',
  },
  hi: {
    appName: 'WaterTank',
    lookingForDevice: 'आपका डिवाइस ढूँढ रहे हैं...',
    connected: 'जुड़ा हुआ',
    disconnected: 'जुड़ा नहीं है',
    lastUpdated: '%t पहले अपडेट किया गया',
    tankLevel: 'टंकी का स्तर',
    motorRunning: 'मोटर चल रही है',
    motorOff: 'मोटर बंद है',
    motorStarting: 'मोटर शुरू हो रही है...',
    waterArrived: 'पानी आ गया',
    tankFull: 'टंकी भरी हुई है',
    pumpManual: 'पंप मैनुअल पर है',
    waitingForWater: 'पानी का इंतज़ार है...',
    nothingHappening: 'अभी कुछ नहीं हो रहा',
    evWaterArrived: 'पानी आ गया',
    evMotorOn: 'मोटर शुरू हुई',
    evMotorOff: 'मोटर बंद हुई',
    evAlreadyFull: 'पानी आया (टंकी पहले से भरी थी)',
    evManualOn: 'पंप मैनुअल पर सेट',
    evManualOff: 'मैनुअल मोड बंद',
    stopTankFull: 'टंकी भर गई',
    stopSupplyCut: 'पानी की सप्लाई बंद',
    stopAlreadyFull: 'पहले से भरी थी',
    records: 'रिकॉर्ड',
    today: 'आज',
    noEventsToday: 'आज कोई गतिविधि नहीं',
    waitingMessage: 'पानी का इंतज़ार है। जब पानी आएगा तब मोटर अपने आप शुरू हो जाएगी।',
    noEventsDate: 'इस दिन कोई गतिविधि नहीं',
    settings: 'सेटिंग्स',
    language: 'भाषा',
    notifyMotorOn: 'मोटर शुरू होने पर सूचना दें',
    notifyMotorOff: 'मोटर बंद होने पर सूचना दें',
    keepRecordsFor: 'रिकॉर्ड कितने दिन रखें',
    days30: '30 दिन',
    days60: '60 दिन',
    days90: '90 दिन',
    shareRecords: 'मेरे रिकॉर्ड शेयर करें',
    clearAllData: 'सभी रिकॉर्ड मिटाएँ',
    clearConfirmTitle: 'सभी रिकॉर्ड मिटाएँ?',
    clearConfirmMsg: 'यह आपके पानी और मोटर के सभी रिकॉर्ड हमेशा के लिए मिटा देगा। यह वापस नहीं किया जा सकता।',
    deleteAll: 'सब मिटाएँ',
    cancel: 'रद्द करें',
    cleared: 'हो गया',
    deviceInfo: 'डिवाइस',
    appVersion: 'ऐप वर्शन',
    deviceName: 'WaterTank',
    aboutTitle: 'के बारे में',
    ob1Title: 'आपकी टंकी, हमेशा निगरानी में',
    ob1Subtitle: 'जब गाँव का पानी आता है, यह ऐप अपने आप मोटर शुरू और बंद करता है।',
    ob2Title: 'दिन हो या रात, अपने आप काम करता है',
    ob2Subtitle: 'जब पंचायत का पानी आता है, मोटर अपने आप शुरू हो जाती है। टंकी भरने पर या पानी बंद होने पर रुक जाती है।',
    ob3Title: 'अपनी भाषा चुनें',
    ob3Subtitle: 'आप इसे बाद में सेटिंग्स में बदल सकते हैं।',
    getStarted: 'शुरू करें',
    next: 'आगे',
    tabDashboard: 'मुख्य',
    tabRecords: 'रिकॉर्ड',
    tabSettings: 'सेटिंग्स',
    justNow: 'अभी',
    minuteAgo: '1 मिनट पहले',
    minutesAgo: '%n मिनट पहले',
    hourAgo: '1 घंटा पहले',
    hoursAgo: '%n घंटे पहले',
  },
  mr: {
    appName: 'WaterTank',
    lookingForDevice: 'तुमचे डिव्हाइस शोधत आहोत...',
    connected: 'जोडलेले',
    disconnected: 'जोडलेले नाही',
    lastUpdated: '%t पूर्वी अपडेट केले',
    tankLevel: 'टाकीची पातळी',
    motorRunning: 'मोटर चालू आहे',
    motorOff: 'मोटर बंद आहे',
    motorStarting: 'मोटर सुरू होत आहे...',
    waterArrived: 'पाणी आले',
    tankFull: 'टाकी भरली आहे',
    pumpManual: 'पंप मॅन्युअल वर आहे',
    waitingForWater: 'पाण्याची वाट पाहत आहे...',
    nothingHappening: 'सध्या काहीही होत नाही',
    evWaterArrived: 'पाणी आले',
    evMotorOn: 'मोटर सुरू झाली',
    evMotorOff: 'मोटर बंद झाली',
    evAlreadyFull: 'पाणी आले (टाकी आधीच भरली होती)',
    evManualOn: 'पंप मॅन्युअल वर सेट',
    evManualOff: 'मॅन्युअल मोड बंद',
    stopTankFull: 'टाकी भरली',
    stopSupplyCut: 'पाणी पुरवठा बंद',
    stopAlreadyFull: 'आधीच भरली होती',
    records: 'नोंदी',
    today: 'आज',
    noEventsToday: 'आज काहीही नोंद नाही',
    waitingMessage: 'पाण्याची वाट पाहत आहे. पाणी आल्यावर मोटर आपोआप सुरू होईल.',
    noEventsDate: 'या दिवशी काहीही नोंद नाही',
    settings: 'सेटिंग्ज',
    language: 'भाषा',
    notifyMotorOn: 'मोटर सुरू झाल्यावर सूचना द्या',
    notifyMotorOff: 'मोटर बंद झाल्यावर सूचना द्या',
    keepRecordsFor: 'नोंदी किती दिवस ठेवायच्या',
    days30: '30 दिवस',
    days60: '60 दिवस',
    days90: '90 दिवस',
    shareRecords: 'माझ्या नोंदी शेअर करा',
    clearAllData: 'सर्व नोंदी मिटवा',
    clearConfirmTitle: 'सर्व नोंदी मिटवायच्या?',
    clearConfirmMsg: 'हे तुमच्या पाण्याच्या आणि मोटरच्या सर्व नोंदी कायमचे मिटवेल. हे परत आणता येणार नाही.',
    deleteAll: 'सर्व मिटवा',
    cancel: 'रद्द करा',
    cleared: 'झाले',
    deviceInfo: 'डिव्हाइस',
    appVersion: 'अ‍ॅप आवृत्ती',
    deviceName: 'WaterTank',
    aboutTitle: 'बद्दल',
    ob1Title: 'तुमची टाकी, सतत लक्षात',
    ob1Subtitle: 'गावाचे पाणी आल्यावर हे अ‍ॅप आपोआप मोटर सुरू आणि बंद करते.',
    ob2Title: 'दिवस असो वा रात्र, आपोआप काम करते',
    ob2Subtitle: 'पंचायतीचे पाणी आल्यावर मोटर आपोआप सुरू होते. टाकी भरल्यावर किंवा पाणी संपल्यावर थांबते.',
    ob3Title: 'तुमची भाषा निवडा',
    ob3Subtitle: 'तुम्ही नंतर सेटिंग्जमध्ये हे बदलू शकता.',
    getStarted: 'सुरू करा',
    next: 'पुढे',
    tabDashboard: 'मुख्य',
    tabRecords: 'नोंदी',
    tabSettings: 'सेटिंग्ज',
    justNow: 'आत्ताच',
    minuteAgo: '1 मिनिट पूर्वी',
    minutesAgo: '%n मिनिटे पूर्वी',
    hourAgo: '1 तास पूर्वी',
    hoursAgo: '%n तास पूर्वी',
  },
  kn: {
    appName: 'WaterTank',
    lookingForDevice: 'ನಿಮ್ಮ ಸಾಧನವನ್ನು ಹುಡುಕುತ್ತಿದೆ...',
    connected: 'ಸಂಪರ್ಕಗೊಂಡಿದೆ',
    disconnected: 'ಸಂಪರ್ಕವಿಲ್ಲ',
    lastUpdated: '%t ಮೊದಲು ನವೀಕರಿಸಲಾಗಿದೆ',
    tankLevel: 'ಟ್ಯಾಂಕ್ ಮಟ್ಟ',
    motorRunning: 'ಮೋಟಾರ್ ಚಾಲನೆಯಲ್ಲಿದೆ',
    motorOff: 'ಮೋಟಾರ್ ಆಫ್ ಆಗಿದೆ',
    motorStarting: 'ಮೋಟಾರ್ ಪ್ರಾರಂಭವಾಗುತ್ತಿದೆ...',
    waterArrived: 'ನೀರು ಬಂದಿದೆ',
    tankFull: 'ಟ್ಯಾಂಕ್ ತುಂಬಿದೆ',
    pumpManual: 'ಪಂಪ್ ಕೈಯಿಂದ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ',
    waitingForWater: 'ನೀರಿಗಾಗಿ ಕಾಯುತ್ತಿದೆ...',
    nothingHappening: 'ಈಗ ಏನೂ ನಡೆಯುತ್ತಿಲ್ಲ',
    evWaterArrived: 'ನೀರು ಬಂದಿದೆ',
    evMotorOn: 'ಮೋಟಾರ್ ಪ್ರಾರಂಭವಾಯಿತು',
    evMotorOff: 'ಮೋಟಾರ್ ನಿಂತಿತು',
    evAlreadyFull: 'ನೀರು ಬಂದಿದೆ (ಟ್ಯಾಂಕ್ ಈಗಾಗಲೇ ತುಂಬಿತ್ತು)',
    evManualOn: 'ಪಂಪ್ ಕೈಯಿಂದ ಸೆಟ್ ಮಾಡಲಾಗಿದೆ',
    evManualOff: 'ಕೈ ಮೋಡ್ ಆಫ್ ಆಗಿದೆ',
    stopTankFull: 'ಟ್ಯಾಂಕ್ ತುಂಬಿದೆ',
    stopSupplyCut: 'ನೀರಿನ ಪೂರೈಕೆ ನಿಂತಿತು',
    stopAlreadyFull: 'ಈಗಾಗಲೇ ತುಂಬಿತ್ತು',
    records: 'ದಾಖಲೆಗಳು',
    today: 'ಇಂದು',
    noEventsToday: 'ಇಂದು ಯಾವುದೇ ಘಟನೆಗಳಿಲ್ಲ',
    waitingMessage: 'ನೀರಿಗಾಗಿ ಕಾಯುತ್ತಿದೆ. ನೀರು ಬಂದಾಗ ಮೋಟಾರ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ.',
    noEventsDate: 'ಈ ದಿನ ಯಾವುದೇ ಘಟನೆಗಳಿಲ್ಲ',
    settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    language: 'ಭಾಷೆ',
    notifyMotorOn: 'ಮೋಟಾರ್ ಪ್ರಾರಂಭವಾದಾಗ ಸೂಚಿಸಿ',
    notifyMotorOff: 'ಮೋಟಾರ್ ನಿಂತಾಗ ಸೂಚಿಸಿ',
    keepRecordsFor: 'ದಾಖಲೆಗಳನ್ನು ಎಷ್ಟು ದಿನ ಇಡಬೇಕು',
    days30: '30 ದಿನಗಳು',
    days60: '60 ದಿನಗಳು',
    days90: '90 ದಿನಗಳು',
    shareRecords: 'ನನ್ನ ದಾಖಲೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ',
    clearAllData: 'ಎಲ್ಲಾ ದಾಖಲೆಗಳನ್ನು ಅಳಿಸಿ',
    clearConfirmTitle: 'ಎಲ್ಲಾ ದಾಖಲೆಗಳನ್ನು ಅಳಿಸಬೇಕೇ?',
    clearConfirmMsg: 'ಇದು ನಿಮ್ಮ ನೀರಿನ ಪೂರೈಕೆ ಮತ್ತು ಮೋಟಾರ್ ದಾಖಲೆಗಳನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸುತ್ತದೆ. ಇದನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗದು.',
    deleteAll: 'ಎಲ್ಲವನ್ನೂ ಅಳಿಸಿ',
    cancel: 'ರದ್ದು',
    cleared: 'ಮುಗಿಯಿತು',
    deviceInfo: 'ಸಾಧನ',
    appVersion: 'ಆ್ಯಪ್ ಆವೃತ್ತಿ',
    deviceName: 'WaterTank',
    aboutTitle: 'ಬಗ್ಗೆ',
    ob1Title: 'ನಿಮ್ಮ ಟ್ಯಾಂಕ್, ಯಾವಾಗಲೂ ಗಮನದಲ್ಲಿ',
    ob1Subtitle: 'ಗ್ರಾಮದ ನೀರು ಬಂದಾಗ ಈ ಆ್ಯಪ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಮೋಟಾರ್ ಪ್ರಾರಂಭಿಸುತ್ತದೆ ಮತ್ತು ನಿಲ್ಲಿಸುತ್ತದೆ.',
    ob2Title: 'ಹಗಲು ರಾತ್ರಿ, ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    ob2Subtitle: 'ಪಂಚಾಯತಿ ನೀರು ಬಂದಾಗ ಮೋಟಾರ್ ಸ್ವತಃ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಟ್ಯಾಂಕ್ ತುಂಬಿದಾಗ ಅಥವಾ ನೀರು ನಿಂತಾಗ ಅದು ನಿಲ್ಲುತ್ತದೆ.',
    ob3Title: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    ob3Subtitle: 'ನೀವು ಇದನ್ನು ನಂತರ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಬದಲಾಯಿಸಬಹುದು.',
    getStarted: 'ಪ್ರಾರಂಭಿಸಿ',
    next: 'ಮುಂದೆ',
    tabDashboard: 'ಮುಖ್ಯ',
    tabRecords: 'ದಾಖಲೆಗಳು',
    tabSettings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    justNow: 'ಈಗ',
    minuteAgo: '1 ನಿಮಿಷ ಮೊದಲು',
    minutesAgo: '%n ನಿಮಿಷಗಳ ಮೊದಲು',
    hourAgo: '1 ಗಂಟೆ ಮೊದಲು',
    hoursAgo: '%n ಗಂಟೆಗಳ ಮೊದಲು',
  },
};

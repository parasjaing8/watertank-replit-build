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
  notifyManualOverride: string;
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
  ob3SetupBtn: string;
  ob3SkipBtn: string;
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
  // tank status labels
  tankHealthy: string;
  tankEmpty: string;
  tankFilling: string;
  waitingForWaterSupply: string;
  // appearance
  appearance: string;
  lightMode: string;
  darkMode: string;
  tankColor: string;
  tankColorBlack: string;
  tankColorBlue: string;
  // dashboard
  tryDemo: string;
  lastSync: string;
  syncNow: string;
  lastKnown: string;
  // notifications
  tankLowNotifBody: string;
  // help — additional FAQs
  helpTankLowQuestion: string;
  helpTankLowAnswer: string;
  helpSyncQuestion: string;
  helpSyncAnswer: string;
  // BLE pairing sheet
  pairDevice: string;
  scanning: string;
  noDeviceFound: string;
  retry: string;
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
    notifyManualOverride: 'Notify on manual override',
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
    ob3Title: 'Set up your device',
    ob3Subtitle: 'Connect your WaterTank ESP32 over Bluetooth to get live tank updates.',
    ob3SetupBtn: 'Set up now',
    ob3SkipBtn: 'Skip for now',
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
    tankHealthy: 'Tank Healthy',
    tankEmpty: 'Tank Empty',
    tankFilling: 'Tank Filling',
    waitingForWaterSupply: 'Waiting for Water Supply',
    appearance: 'Appearance',
    lightMode: 'Light',
    darkMode: 'Dark',
    tankColor: 'Tank Color',
    tankColorBlack: 'Black',
    tankColorBlue: 'Blue',
    tryDemo: 'Try Demo',
    lastSync: 'Last sync',
    syncNow: 'Sync now',
    lastKnown: 'Last known',
    tankLowNotifBody: 'Tank water is low. Village supply may not have arrived yet.',
    helpTankLowQuestion: 'Tank level is low. What should I do?',
    helpTankLowAnswer: 'If the tank is low and the motor has not started, village water has not arrived yet. Wait — the motor starts automatically when water comes. If water has arrived but the motor did not start, check that the WaterTank device has power and is within Bluetooth range.',
    helpSyncQuestion: 'How do I get the latest data from the device?',
    helpSyncAnswer: 'The app syncs automatically when it connects to the device. If you want to refresh immediately, tap the sync icon at the top of the dashboard while the device is connected.',
    pairDevice: 'Pair your device',
    scanning: 'Scanning…',
    noDeviceFound: 'No WATERTANK devices found. Make sure your device is powered on and nearby.',
    retry: 'Retry',
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
    pumpManual: 'पंप हाथ से चल रहा है',
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
    notifyManualOverride: 'मैनुअल ओवरराइड पर सूचना दें',
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
    appVersion: 'एप वर्शन',
    deviceName: 'WaterTank',
    aboutTitle: 'के बारे में',
    ob1Title: 'आपकी टंकी, हमेशा निगरानी में',
    ob1Subtitle: 'जब गाँव का पानी आता है, यह एप अपने आप मोटर शुरू और बंद करता है।',
    ob2Title: 'दिन हो या रात, अपने आप काम करता है',
    ob2Subtitle: 'जब पंचायत का पानी आता है, मोटर अपने आप शुरू हो जाती है। टंकी भरने पर या पानी बंद होने पर रुक जाती है।',
    ob3Title: 'अपना डिवाइस सेटअप करें',
    ob3Subtitle: 'लाइव टंकी अपडेट पाने के लिए WaterTank ESP32 को Bluetooth से जोड़ें।',
    ob3SetupBtn: 'अभी सेटअप करें',
    ob3SkipBtn: 'अभी नहीं',
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
    helpConnectQuestion: "एप कह रहा है 'जुड़ा नहीं है'। क्या करूँ?",
    helpConnectAnswer: 'देखें कि WaterTank डिवाइस चालू है और 10 मीटर के अंदर है। एप अपने आप जुड़ जाएगा — आपको कुछ दबाने की ज़रूरत नहीं।',
    helpManualQuestion: 'मैनुअल मोड क्या है?',
    helpManualAnswer: 'मैनुअल मोड का मतलब है कि किसी ने डिवाइस पर हाथ से पंप चालू किया है। जब यह चालू होता है तो एप लाल पट्टी दिखाता है।',
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
    tankHealthy: 'टंकी ठीक है',
    tankEmpty: 'टंकी खाली है',
    tankFilling: 'टंकी भर रही है',
    waitingForWaterSupply: 'पानी की सप्लाई का इंतज़ार',
    appearance: 'दिखावट',
    lightMode: 'हल्का',
    darkMode: 'गहरा',
    tankColor: 'टंकी का रंग',
    tankColorBlack: 'काला',
    tankColorBlue: 'नीला',
    tryDemo: 'डेमो देखें',
    lastSync: 'अंतिम सिंक',
    syncNow: 'अभी सिंक करें',
    lastKnown: 'पिछली जानकारी',
    tankLowNotifBody: 'टंकी में पानी कम है। गाँव का पानी अभी नहीं आया होगा।',
    helpTankLowQuestion: 'टंकी में पानी कम है। क्या करूँ?',
    helpTankLowAnswer: 'अगर टंकी में पानी कम है और मोटर नहीं चली, तो गाँव का पानी अभी नहीं आया है। इंतज़ार करें — पानी आने पर मोटर अपने आप शुरू हो जाएगी। अगर पानी आ गया है पर मोटर नहीं चली, तो देखें कि WaterTank डिवाइस चालू है और पास में है।',
    helpSyncQuestion: 'डिवाइस से ताज़ा डेटा कैसे पाएँ?',
    helpSyncAnswer: 'जब एप डिवाइस से जुड़ता है, तो डेटा अपने आप अपडेट होता है। तुरंत रिफ्रेश के लिए, डिवाइस जुड़े होने पर डैशबोर्ड के ऊपर सिंक बटन दबाएँ।',
    pairDevice: 'अपना डिवाइस जोड़ें',
    scanning: 'स्कैन हो रहा है…',
    noDeviceFound: 'कोई WATERTANK डिवाइस नहीं मिला। सुनिश्चित करें कि डिवाइस चालू है और पास में है।',
    retry: 'फिर से कोशिश करें',
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
    pumpManual: 'पंप हाताने चालू आहे',
    waitingForWater: 'पाण्याची वाट पाहत आहे...',
    nothingHappening: 'सध्या काहीही होत नाही',
    evWaterArrived: 'पाणी आले',
    evMotorOn: 'मोटर सुरू झाली',
    evMotorOff: 'मोटर बंद झाली',
    evAlreadyFull: 'पाणी आले (टाकी आधीच भरली होती)',
    evManualOn: 'पंप म्यान्युअल वर सेट',
    evManualOff: 'म्यान्युअल मोड बंद',
    stopTankFull: 'टाकी भरली',
    stopSupplyCut: 'पाणी पुरवठा बंद',
    stopAlreadyFull: 'आधीच भरली होती',
    records: 'नोंदी',
    today: 'आज',
    noEventsToday: 'आज काहीही नोंद नाही',
    waitingMessage: 'पाण्याची वाट पाहत आहे। पाणी आल्यावर मोटर आपोआप सुरू होईल।',
    noEventsDate: 'या दिवशी काहीही नोंद नाही',
    settings: 'सेटिंग्ज',
    language: 'भाषा',
    notifyMotorOn: 'मोटर सुरू झाल्यावर सूचना द्या',
    notifyMotorOff: 'मोटर बंद झाल्यावर सूचना द्या',
    notifyManualOverride: 'मॅन्युअल ओव्हरराइडवर सूचना द्या',
    keepRecordsFor: 'नोंदी किती दिवस ठेवायच्या',
    days30: '30 दिवस',
    days60: '60 दिवस',
    days90: '90 दिवस',
    shareRecords: 'माझ्या नोंदी शेअर करा',
    clearAllData: 'सर्व नोंदी मिटवा',
    clearConfirmTitle: 'सर्व नोंदी मिटवायच्या?',
    clearConfirmMsg: 'हे तुमच्या पाण्याच्या आणि मोटरच्या सर्व नोंदी कायमचे मिटवेल। हे परत आणता येणार नाही।',
    deleteAll: 'सर्व मिटवा',
    cancel: 'रद्द करा',
    cleared: 'झाले',
    deviceInfo: 'डिव्हाइस',
    appVersion: 'अ‍ॅप आवृत्ती',
    deviceName: 'WaterTank',
    aboutTitle: 'बद्दल',
    ob1Title: 'तुमची टाकी, सतत लक्षात',
    ob1Subtitle: 'गावाचे पाणी आल्यावर हे अ‍ॅप आपोआप मोटर सुरू आणि बंद करते।',
    ob2Title: 'दिवस असो वा रात्र, आपोआप काम करते',
    ob2Subtitle: 'पंचायतीचे पाणी आल्यावर मोटर आपोआप सुरू होते। टाकी भरल्यावर किंवा पाणी संपल्यावर थांबते।',
    ob3Title: 'तुमचे डिव्हाइस सेट करा',
    ob3Subtitle: 'थेट टाकी अपडेट मिळवण्यासाठी WaterTank ESP32 Bluetooth ने जोडा।',
    ob3SetupBtn: 'आत्ता सेट करा',
    ob3SkipBtn: 'नंतर करा',
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
    deviceConnecting: 'तुमचे WaterTank डिव्हाइस चालू असल्याची खात्री करा। आम्ही आपोआप जोडू।',
    checkDevicePower: 'डिव्हाइस चालू आहे आणि जवळ आहे का ते पाहा।',
    helpTitle: 'मदत आणि प्रश्न',
    helpHowItWorks: 'हे कसे काम करते',
    helpMotorQuestion: 'मोटर कधी सुरू होते?',
    helpMotorAnswer: 'गावाचे पाणी आल्यावर आणि टाकी 95% पेक्षा कमी असल्यास मोटर आपोआप सुरू होते। पाईपातून हवा बाहेर पडण्यासाठी 45 सेकंद थांबते।',
    helpConnectQuestion: "अ‍ॅप 'जोडलेले नाही' दाखवते। काय करावे?",
    helpConnectAnswer: 'WaterTank डिव्हाइस चालू आहे आणि 10 मीटरच्या आत आहे का ते पाहा। अ‍ॅप आपोआप जोडेल — तुम्हाला काही दाबायची गरज नाही।',
    helpManualQuestion: 'म्यान्युअल मोड म्हणजे काय?',
    helpManualAnswer: 'म्यान्युअल मोड म्हणजे कोणीतरी डिव्हाइसवर हाताने पंप सुरू केला आहे। हे चालू असताना अ‍ॅप लाल पट्टी दाखवते।',
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
    tankHealthy: 'टाकी ठीक आहे',
    tankEmpty: 'टाकी रिकामी आहे',
    tankFilling: 'टाकी भरत आहे',
    waitingForWaterSupply: 'पाण्याच्या पुरवठ्याची वाट',
    appearance: 'रूप',
    lightMode: 'उजळ',
    darkMode: 'गडद',
    tankColor: 'टाकीचा रंग',
    tankColorBlack: 'काळा',
    tankColorBlue: 'निळा',
    tryDemo: 'डेमो पाहा',
    lastSync: 'शेवटची सिंक',
    syncNow: 'आत्ता सिंक करा',
    lastKnown: 'शेवटची माहिती',
    tankLowNotifBody: 'टाकीत पाणी कमी आहे. गावाचे पाणी अजून आले नसेल.',
    helpTankLowQuestion: 'टाकीत पाणी कमी आहे. काय करावे?',
    helpTankLowAnswer: 'जर टाकीत पाणी कमी असेल आणि मोटर सुरू झाली नसेल, तर गावाचे पाणी अजून आलेले नाही. थांबा — पाणी आल्यावर मोटर आपोआप सुरू होईल. पाणी आले असेल पण मोटर सुरू झाली नसेल, तर WaterTank डिव्हाइस चालू आहे आणि जवळ आहे का ते पाहा.',
    helpSyncQuestion: 'डिव्हाइसमधून नवीन डेटा कसा मिळवायचा?',
    helpSyncAnswer: 'जेव्हा अ‍ॅप डिव्हाइसशी जोडतो तेव्हा डेटा आपोआप अपडेट होतो. तत्काळ रिफ्रेश करण्यासाठी डिव्हाइस जोडलेले असताना डॅशबोर्डच्या वरील सिंक बटण दाबा.',
    pairDevice: 'तुमचे डिव्हाइस जोडा',
    scanning: 'स्कॅन होत आहे…',
    noDeviceFound: 'कोणतेही WATERTANK डिव्हाइस सापडले नाही. डिव्हाइस चालू आहे आणि जवळ आहे याची खात्री करा.',
    retry: 'पुन्हा प्रयत्न करा',
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
    pumpManual: 'ಪಂಪ್ ಕೈಯಿಂದ ಆನ್ ಆಗಿದೆ',
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
    waitingMessage: 'ನೀರಿಗಾಗಿ ಕಾಯುತ್ತಿದೆ। ನೀರು ಬಂದಾಗ ಮೋಟಾರ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ।',
    noEventsDate: 'ಈ ದಿನ ಯಾವುದೇ ಘಟನೆಗಳಿಲ್ಲ',
    settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    language: 'ಭಾಷೆ',
    notifyMotorOn: 'ಮೋಟಾರ್ ಪ್ರಾರಂಭವಾದಾಗ ಸೂಚಿಸಿ',
    notifyMotorOff: 'ಮೋಟಾರ್ ನಿಂತಾಗ ಸೂಚಿಸಿ',
    notifyManualOverride: 'ಕೈಪಿಡಿ ಓವರ್‌ರೈಡ್‌ನಲ್ಲಿ ಸೂಚಿಸಿ',
    keepRecordsFor: 'ದಾಖಲೆಗಳನ್ನು ಎಷ್ಟು ದಿನ ಇಡಬೇಕು',
    days30: '30 ದಿನಗಳು',
    days60: '60 ದಿನಗಳು',
    days90: '90 ದಿನಗಳು',
    shareRecords: 'ನನ್ನ ದಾಖಲೆಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ',
    clearAllData: 'ಎಲ್ಲಾ ದಾಖಲೆಗಳನ್ನು ಅಳಿಸಿ',
    clearConfirmTitle: 'ಎಲ್ಲಾ ದಾಖಲೆಗಳನ್ನು ಅಳಿಸಬೇಕೇ?',
    clearConfirmMsg: 'ಇದು ನಿಮ್ಮ ನೀರಿನ ಪೂರೈಕೆ ಮತ್ತು ಮೋಟಾರ್ ದಾಖಲೆಗಳನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸುತ್ತದೆ। ಇದನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗದು।',
    deleteAll: 'ಎಲ್ಲವನ್ನೂ ಅಳಿಸಿ',
    cancel: 'ರದ್ದು',
    cleared: 'ಮುಗಿಯಿತು',
    deviceInfo: 'ಸಾಧನ',
    appVersion: 'ಆ್ಯಪ್ ಆವೃತ್ತಿ',
    deviceName: 'WaterTank',
    aboutTitle: 'ಬಗ್ಗೆ',
    ob1Title: 'ನಿಮ್ಮ ಟ್ಯಾಂಕ್, ಯಾವಾಗಲೂ ಗಮನದಲ್ಲಿ',
    ob1Subtitle: 'ಗ್ರಾಮದ ನೀರು ಬಂದಾಗ ಈ ಆ್ಯಪ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಮೋಟಾರ್ ಪ್ರಾರಂಭಿಸುತ್ತದೆ ಮತ್ತು ನಿಲ್ಲಿಸುತ್ತದೆ।',
    ob2Title: 'ಹಗಲು ರಾತ್ರಿ, ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    ob2Subtitle: 'ಪಂಚಾಯತಿ ನೀರು ಬಂದಾಗ ಮೋಟಾರ್ ಸ್ವತಸ್ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ। ಟ್ಯಾಂಕ್ ತುಂಬಿದಾಗ ಅಥವಾ ನೀರು ನಿಂತಾಗ ಅದು ನಿಲ್ಲುತ್ತದೆ।',
    ob3Title: 'ನಿಮ್ಮ ಸಾಧನ ಸೆಟಪ್ ಮಾಡಿ',
    ob3Subtitle: 'ನೇರ ಟ್ಯಾಂಕ್ ಅಪ್ಡೇಟ್‌ಗಳಿಗಾಗಿ WaterTank ESP32 ಅನ್ನು Bluetooth ಮೂಲಕ ಸಂಪರ್ಕಿಸಿ।',
    ob3SetupBtn: 'ಈಗ ಸೆಟಪ್ ಮಾಡಿ',
    ob3SkipBtn: 'ಈಗ ಬೇಡ',
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
    deviceConnecting: 'ನಿಮ್ಮ WaterTank ಸಾಧನವು ಆನ್ ಆಗಿದೆಯೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ। ನಾವು ತಾನಾಗಿಯೇ ಸಂಪರ್ಕಿಸುತ್ತೇವೆ।',
    checkDevicePower: 'ಸಾಧನವು ಆನ್ ಆಗಿದೆ ಮತ್ತು ಹತ್ತಿರದಲ್ಲಿದೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ।',
    helpTitle: 'ಸಹಾಯ ಮತ್ತು ಪ್ರಶ್ನೆಗಳು',
    helpHowItWorks: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    helpMotorQuestion: 'ಮೋಟಾರ್ ಯಾವಾಗ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ?',
    helpMotorAnswer: 'ಗ್ರಾಮದ ನೀರು ಬಂದಾಗ ಮತ್ತು ಟ್ಯಾಂಕ್ 95% ಕ್ಕಿಂತ ಕಡಿಮೆ ಇದ್ದಾಗ ಮೋಟಾರ್ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ। ಪೈಪ್‌ನಿಂದ ಗಾಳಿ ತೆಗೆದುಹಾಕಲು 45 ಸೆಕೆಂಡುಗಳ ವಿಳಂಬವಿದೆ।',
    helpConnectQuestion: "ಆ್ಯಪ್ 'ಸಂಪರ್ಕವಿಲ್ಲ' ಎಂದು ತೋರಿಸುತ್ತಿದೆ। ಏನು ಮಾಡಬೇಕು?",
    helpConnectAnswer: 'WaterTank ಸಾಧನವು ಆನ್ ಆಗಿದೆ ಮತ್ತು 10 ಮೀಟರ್ ಒಳಗೆ ಇದೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ। ಆ್ಯಪ್ ತಾನಾಗಿಯೇ ಸಂಪರ್ಕಿಸುತ್ತದೆ — ನೀವು ಏನನೂ ಒತ್ತುವ ಅಗತ್ಯವಿಲ್ಲ।',
    helpManualQuestion: 'ಕೈ ಮೋಡ್ ಎಂದರೇನು?',
    helpManualAnswer: 'ಕೈ ಮೋಡ್ ಎಂದರೆ ಯಾರಾದರು ಸಾಧನದಲ್ಲಿ ಕೈಯಿಂದ ಪಂಪ್ ಆನ್ ಮಾಡಿದ್ದಾರೆ। ಇದು ಆನ್ ಆಗಿರುವಾಗ ಆ್ಯಪ್ ಕೆಂಪು ಪಟ್ಟಿಯನ್ನು ತೋರಿಸುತ್ತದೆ।',
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
    tankHealthy: 'ಟ್ಯಾಂಕ್ ಸ್ವಸ್ಥವಾಗಿದೆ',
    tankEmpty: 'ಟ್ಯಾಂಕ್ ಖಾಲಿಯಾಗಿದೆ',
    tankFilling: 'ಟ್ಯಾಂಕ್ ತುಂಬುತ್ತಿದೆ',
    waitingForWaterSupply: 'ನೀರಿನ ಪೂರೈಕೆಗಾಗಿ ಕಾಯುತ್ತಿದೆ',
    appearance: 'ನೋಟ',
    lightMode: 'ಬೆಳಕು',
    darkMode: 'ಕತ್ತಲು',
    tankColor: 'ಟ್ಯಾಂಕ್ ಬಣ್ಣ',
    tankColorBlack: 'ಕಪ್ಪು',
    tankColorBlue: 'ನೀಲಿ',
    tryDemo: 'ಡೆಮೊ ನೋಡಿ',
    lastSync: 'ಕೊನೆಯ ಸಿಂಕ್',
    syncNow: 'ಈಗ ಸಿಂಕ್ ಮಾಡಿ',
    lastKnown: 'ಕೊನೆಯ ಮಾಹಿತಿ',
    tankLowNotifBody: 'ಟ್ಯಾಂಕ್‌ನಲ್ಲಿ ನೀರು ಕಡಿಮೆ ಇದೆ. ಊರಿನ ನೀರು ಇನ್ನೂ ಬಂದಿಲ್ಲದಿರಬಹುದು.',
    helpTankLowQuestion: 'ಟ್ಯಾಂಕ್‌ನಲ್ಲಿ ನೀರು ಕಡಿಮೆ ಇದೆ. ನಾನು ಏನು ಮಾಡಬೇಕು?',
    helpTankLowAnswer: 'ಟ್ಯಾಂಕ್ ಕಡಿಮೆ ಇದ್ದು ಮೋಟಾರ್ ಶುರುವಾಗದಿದ್ದರೆ, ಊರಿನ ನೀರು ಇನ್ನೂ ಬಂದಿಲ್ಲ. ಕಾಯಿರಿ — ನೀರು ಬಂದಾಗ ಮೋಟಾರ್ ತಾನಾಗಿ ಶುರುವಾಗುತ್ತದೆ. ನೀರು ಬಂದಿದ್ದರೆ ಮೋಟಾರ್ ಶುರುವಾಗದಿದ್ದರೆ, WaterTank ಸಾಧನ ಆನ್ ಆಗಿದೆ ಮತ್ತು ಹತ್ತಿರದಲ್ಲಿದೆ ಎಂದು ಖಚಿತಪಡಿಸಿ.',
    helpSyncQuestion: 'ಸಾಧನದಿಂದ ಹೊಸ ಡೇಟಾ ಹೇಗೆ ತರಬೇಕು?',
    helpSyncAnswer: 'ಅಪ್ಲಿಕೇಶನ್ ಸಾಧನಕ್ಕೆ ಸಂಪರ್ಕಗೊಂಡಾಗ ಡೇಟಾ ತಾನಾಗಿ ಅಪ್‌ಡೇಟ್ ಆಗುತ್ತದೆ. ತಕ್ಷಣ ರಿಫ್ರೆಶ್ ಮಾಡಲು, ಸಾಧನ ಸಂಪರ್ಕಿತವಾಗಿರುವಾಗ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮೇಲ್ಭಾಗದ ಸಿಂಕ್ ಬಟನ್ ಒತ್ತಿ.',
    pairDevice: 'ನಿಮ್ಮ ಸಾಧನ ಜೋಡಿಸಿ',
    scanning: 'ಸ್ಕ್ಯಾನ್ ಆಗುತ್ತಿದೆ…',
    noDeviceFound: 'WATERTANK ಸಾಧನ ಸಿಗಲಿಲ್ಲ. ಸಾಧನ ಆನ್ ಆಗಿದೆ ಮತ್ತು ಹತ್ತಿರದಲ್ಲಿದೆ ಎಂದು ಖಚಿತಪಡಿಸಿ.',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
  },
};

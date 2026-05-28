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
  motorStatus: string;
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
  pressBootHint: string;
  orTryDemo: string;
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
  avgFillTime: string;
  supplyWindow_morning: string;
  supplyWindow_afternoon: string;
  supplyWindow_evening: string;
  supplyWindow_night: string;
  weeklyNoData: string;
  // tank size
  litres: string;
  tankSizeLabel: string;
  tankSizePlaceholder: string;
  configureTankSize: string;
  fillTargetLabel: string;
  fillTargetHint: string;
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
  // Setup guide
  setupGuide: string;
  setupPage1: string;
  setupPage2: string;
  setupPage3: string;
  setupHint: string;
  // Report problem
  reportProblem: string;
  reportSelectIssue: string;
  issueMotorNotStart: string;
  issueWrongLevel: string;
  issueAppCrash: string;
  issueOther: string;
  reportSendWhatsApp: string;
  reportMsgGreeting: string;
  reportMsgIssue: string;
  reportMsgTime: string;
  reportMsgLog: string;
  // Firmware update screen
  fwUpdateTitle: string;
  fwDeviceFirmware: string;
  fwAvailable: string;
  fwUpToDate: string;
  fwChangelog: string;
  fwDownloading: string;
  fwTransferring: string;
  fwKeepClose: string;
  fwRebooting: string;
  fwConfirming: string;
  fwRebootHint: string;
  fwConfirmHint: string;
  fwDoneTitle: string;
  fwDoneBody: string;
  fwCancelledTitle: string;
  fwCancelledBody: string;
  fwCancelledWaiting: string;
  fwErrorTitle: string;
  fwErrorFallback: string;
  fwErrorRollback: string;
  fwInstall: string;
  fwDone: string;
  fwRetry: string;
  fwTimeout60: string;
  // Municipal supply status
  municipalSupply: string;
  supplyOn: string;
  supplyOff: string;
  // Auth / pairing
  authEnterPassword: string;
  authPasswordHint: string;
  authConnect: string;
  authWrongPassword: string;
  authConnecting: string;
  // First-time setup modal
  setupTitle: string;
  setupSubtitle: string;
  setupDeviceName: string;
  setupDeviceNamePlaceholder: string;
  setupNewPassword: string;
  setupConfirmPassword: string;
  setupPasswordMismatch: string;
  setupPasswordTooShort: string;
  setupSave: string;
  setupSaving: string;
  // Settings — paired devices
  pairedDevices: string;
  allowNewPairing: string;
  pairingWindowOpen: string;
  removeThisDevice: string;
  removeDeviceConfirmTitle: string;
  removeDeviceConfirmMsg: string;
  // motor / inlet status
  on: string;
  off: string;
  // error fallback
  errorTitle: string;
  errorMessage: string;
  errorTryAgain: string;
  errorDetails: string;
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
    motorStatus: 'Motor Status',
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
    pressBootHint: 'Still not connecting? Short-press the button on your device to open a reconnect window.',
    orTryDemo: 'or, try the demo —',
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
    avgFillTime: 'Avg fill time',
    supplyWindow_morning: 'Supply usually arrives in the morning (5 AM – noon)',
    supplyWindow_afternoon: 'Supply usually arrives in the afternoon (noon – 5 PM)',
    supplyWindow_evening: 'Supply usually arrives in the evening (5 PM – 9 PM)',
    supplyWindow_night: 'Supply usually arrives at night (9 PM – 5 AM)',
    weeklyNoData: 'No motor runs this week',
    litres: 'L',
    tankSizeLabel: 'Tank size',
    tankSizePlaceholder: '1000',
    configureTankSize: 'Set tank size to see litres',
    fillTargetLabel: 'Auto-stop fill level',
    fillTargetHint: 'Motor stops when tank reaches this level',
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
    setupGuide: 'Hardware Setup Guide',
    setupPage1: "What's in the Box",
    setupPage2: 'System Overview',
    setupPage3: 'Installation Steps',
    setupHint: 'Need help with hardware setup? See Setup Guide in Settings.',
    reportProblem: 'Report a Problem',
    reportSelectIssue: 'What went wrong?',
    issueMotorNotStart: 'Motor did not start',
    issueWrongLevel: 'Wrong water level shown',
    issueAppCrash: 'App stopped working',
    issueOther: 'Something else',
    reportSendWhatsApp: 'Send via WhatsApp',
    reportMsgGreeting: 'Hello,\nI have a problem with my WaterTank device.',
    reportMsgIssue: 'Issue',
    reportMsgTime: 'Time',
    reportMsgLog: 'Diagnostic log',
    fwUpdateTitle: 'Firmware Update',
    fwDeviceFirmware: 'Device firmware',
    fwAvailable: 'Available',
    fwUpToDate: 'Firmware is up to date.',
    fwChangelog: 'CHANGELOG',
    fwDownloading: 'Downloading firmware…',
    fwTransferring: 'Transferring firmware…',
    fwKeepClose: 'Keep phone within 2 metres. Do not close the app.',
    fwRebooting: 'Device rebooting…',
    fwConfirming: 'Confirming update…',
    fwRebootHint: 'The device will reconnect automatically in ~10 seconds.',
    fwConfirmHint: 'Verifying new firmware version on device.',
    fwDoneTitle: 'Update complete',
    fwDoneBody: 'Device is now running firmware',
    fwCancelledTitle: 'Transfer cancelled',
    fwCancelledBody: 'The device is mid-flash. Power-cycle the device before trying again — it will roll back to the previous firmware automatically.',
    fwCancelledWaiting: 'Waiting for device to disconnect…',
    fwErrorTitle: 'Update failed',
    fwErrorFallback: 'An unknown error occurred.',
    fwErrorRollback: 'Device has automatically rolled back to the previous firmware.',
    fwInstall: 'Install',
    fwDone: 'Done',
    fwRetry: 'Try Again',
    fwTimeout60: 'Device did not reconnect after 60 seconds. Check device power and retry.',
    municipalSupply: 'Municipal Supply',
    supplyOn: 'Water Available',
    supplyOff: 'No Water at Inlet',
    authEnterPassword: 'Enter Password',
    authPasswordHint: 'New device detected. Default password: 1234',
    authConnect: 'Connect',
    authWrongPassword: 'Incorrect password. Try again.',
    authConnecting: 'Verifying…',
    setupTitle: 'Set Up Your Device',
    setupSubtitle: 'Choose a name and new password for your WaterTank device.',
    setupDeviceName: 'Device Name',
    setupDeviceNamePlaceholder: 'WaterTank',
    setupNewPassword: 'New Password',
    setupConfirmPassword: 'Confirm Password',
    setupPasswordMismatch: 'Passwords do not match.',
    setupPasswordTooShort: 'Password must be at least 4 characters.',
    setupSave: 'Save & Connect',
    setupSaving: 'Saving…',
    pairedDevices: 'Paired Devices',
    allowNewPairing: 'Allow New Device to Pair',
    pairingWindowOpen: 'Pairing window open',
    removeThisDevice: 'Remove All Paired Devices',
    removeDeviceConfirmTitle: 'Remove paired devices?',
    removeDeviceConfirmMsg: 'This phone will need to enter the password again to reconnect.',
    on: 'ON',
    off: 'OFF',
    errorTitle: 'Something went wrong',
    errorMessage: 'Please reload the app to continue.',
    errorTryAgain: 'Try Again',
    errorDetails: 'Error Details',
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
    motorStatus: 'मोटर स्थिति',
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
    pressBootHint: 'अभी भी नहीं जुड़ा? डिवाइस का बटन एक बार दबाएँ।',
    orTryDemo: 'या, डेमो देखें —',
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
    avgFillTime: 'औसत भरने का समय',
    supplyWindow_morning: 'पानी आमतौर पर सुबह आता है (5 AM – दोपहर)',
    supplyWindow_afternoon: 'पानी आमतौर पर दोपहर में आता है (दोपहर – 5 PM)',
    supplyWindow_evening: 'पानी आमतौर पर शाम को आता है (5 PM – 9 PM)',
    supplyWindow_night: 'पानी आमतौर पर रात को आता है (9 PM – 5 AM)',
    weeklyNoData: 'इस हफ़्ते मोटर नहीं चली',
    litres: 'ली',
    tankSizeLabel: 'टंकी का आकार',
    tankSizePlaceholder: '1000',
    configureTankSize: 'लीटर देखने के लिए टंकी का आकार सेट करें',
    fillTargetLabel: 'स्वतः बंद स्तर',
    fillTargetHint: 'टंकी इस स्तर पर पहुँचने पर मोटर बंद हो जाएगी',
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
    setupGuide: 'हार्डवेयर सेटअप गाइड',
    setupPage1: 'बॉक्स में क्या है',
    setupPage2: 'सिस्टम का अवलोकन',
    setupPage3: 'इंस्टॉलेशन के चरण',
    setupHint: 'हार्डवेयर सेटअप में मदद चाहिए? सेटिंग्स में सेटअप गाइड देखें।',
    reportProblem: 'समस्या बताएं',
    reportSelectIssue: 'क्या गड़बड़ी हुई?',
    issueMotorNotStart: 'मोटर शुरू नहीं हुई',
    issueWrongLevel: 'पानी का स्तर गलत दिख रहा है',
    issueAppCrash: 'ऐप बंद हो गया',
    issueOther: 'कोई और समस्या',
    reportSendWhatsApp: 'WhatsApp पर भेजें',
    reportMsgGreeting: 'नमस्कार,\nमेरे WaterTank डिवाइस में समस्या है।',
    reportMsgIssue: 'समस्या',
    reportMsgTime: 'समय',
    reportMsgLog: 'डायग्नोस्टिक लॉग',
    fwUpdateTitle: 'फर्मवेयर अपडेट',
    fwDeviceFirmware: 'डिवाइस फर्मवेयर',
    fwAvailable: 'उपलब्ध',
    fwUpToDate: 'फर्मवेयर अप टू डेट है।',
    fwChangelog: 'बदलाव',
    fwDownloading: 'फर्मवेयर डाउनलोड हो रहा है…',
    fwTransferring: 'फर्मवेयर भेजा जा रहा है…',
    fwKeepClose: 'फोन 2 मीटर के पास रखें। ऐप बंद न करें।',
    fwRebooting: 'डिवाइस रिस्टार्ट हो रहा है…',
    fwConfirming: 'अपडेट की जांच हो रही है…',
    fwRebootHint: 'डिवाइस लगभग 10 सेकंड में फिर से जुड़ जाएगा।',
    fwConfirmHint: 'डिवाइस पर नए फर्मवेयर की जांच हो रही है।',
    fwDoneTitle: 'अपडेट पूरा हुआ',
    fwDoneBody: 'डिवाइस अब फर्मवेयर पर चल रहा है',
    fwCancelledTitle: 'ट्रांसफर रद्द हुआ',
    fwCancelledBody: 'डिवाइस आधे फ्लैश में है। दोबारा कोशिश से पहले डिवाइस को बंद-चालू करें — वह पुराने फर्मवेयर पर वापस आ जाएगा।',
    fwCancelledWaiting: 'डिवाइस के डिस्कनेक्ट होने की प्रतीक्षा…',
    fwErrorTitle: 'अपडेट विफल हुआ',
    fwErrorFallback: 'अज्ञात त्रुटि हुई।',
    fwErrorRollback: 'डिवाइस स्वचालित रूप से पुराने फर्मवेयर पर वापस आ गया।',
    fwInstall: 'इंस्टॉल करें',
    fwDone: 'हो गया',
    fwRetry: 'फिर कोशिश करें',
    fwTimeout60: '60 सेकंड बाद भी डिवाइस नहीं जुड़ा। डिवाइस की पावर जांचें और दोबारा कोशिश करें।',
    municipalSupply: 'नगरपालिका सप्लाई',
    supplyOn: 'पानी उपलब्ध है',
    supplyOff: 'इनलेट पर पानी नहीं',
    authEnterPassword: 'पासवर्ड डालें',
    authPasswordHint: 'नया डिवाइस मिला। डिफ़ॉल्ट पासवर्ड: 1234',
    authConnect: 'जोड़ें',
    authWrongPassword: 'गलत पासवर्ड। फिर कोशिश करें।',
    authConnecting: 'जाँच हो रही है…',
    setupTitle: 'डिवाइस सेटअप करें',
    setupSubtitle: 'अपने WaterTank डिवाइस के लिए नाम और नया पासवर्ड चुनें।',
    setupDeviceName: 'डिवाइस का नाम',
    setupDeviceNamePlaceholder: 'WaterTank',
    setupNewPassword: 'नया पासवर्ड',
    setupConfirmPassword: 'पासवर्ड की पुष्टि करें',
    setupPasswordMismatch: 'पासवर्ड मेल नहीं खाते।',
    setupPasswordTooShort: 'पासवर्ड कम से कम 4 अक्षर का होना चाहिए।',
    setupSave: 'सेव करें और जोड़ें',
    setupSaving: 'सेव हो रहा है…',
    pairedDevices: 'जुड़े डिवाइस',
    allowNewPairing: 'नए डिवाइस को जोड़ने दें',
    pairingWindowOpen: 'पेयरिंग विंडो खुली है',
    removeThisDevice: 'सभी जुड़े डिवाइस हटाएँ',
    removeDeviceConfirmTitle: 'जुड़े डिवाइस हटाएँ?',
    removeDeviceConfirmMsg: 'इस फोन को दोबारा जोड़ने के लिए पासवर्ड डालना होगा।',
    on: 'चालू',
    off: 'बंद',
    errorTitle: 'कुछ गलत हो गया',
    errorMessage: 'कृपया ऐप को पुनः लोड करें।',
    errorTryAgain: 'पुनः प्रयास करें',
    errorDetails: 'त्रुटि विवरण',
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
    motorStatus: 'मोटर स्थिती',
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
    pressBootHint: 'अजूनही जोडले नाही? डिव्हाइसवरील बटण एकदा दाबा।',
    orTryDemo: 'किंवा, डेमो पाहा —',
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
    avgFillTime: 'सरासरी भरण्याचा वेळ',
    supplyWindow_morning: 'पाणी सहसा सकाळी येते (5 AM – दुपारी)',
    supplyWindow_afternoon: 'पाणी सहसा दुपारी येते (दुपारी – 5 PM)',
    supplyWindow_evening: 'पाणी सहसा संध्याकाळी येते (5 PM – 9 PM)',
    supplyWindow_night: 'पाणी सहसा रात्री येते (9 PM – 5 AM)',
    weeklyNoData: 'या आठवड्यात मोटर चालली नाही',
    litres: 'ली',
    tankSizeLabel: 'टाकीचा आकार',
    tankSizePlaceholder: '1000',
    configureTankSize: 'लीटर पाहण्यासाठी टाकीचा आकार सेट करा',
    fillTargetLabel: 'स्वयं-बंद पातळी',
    fillTargetHint: 'टाकी या पातळीवर पोहोचल्यावर मोटर बंद होईल',
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
    setupGuide: 'हार्डवेअर सेटअप मार्गदर्शक',
    setupPage1: 'बॉक्समध्ये काय आहे',
    setupPage2: 'सिस्टम आढावा',
    setupPage3: 'इंस्टॉलेशन चरण',
    setupHint: 'हार्डवेअर सेटअपसाठी मदत हवी? सेटिंग्जमध्ये सेटअप मार्गदर्शक पाहा.',
    reportProblem: 'समस्या सांगा',
    reportSelectIssue: 'काय समस्या आहे?',
    issueMotorNotStart: 'मोटर चालू झाली नाही',
    issueWrongLevel: 'चुकीची पाण्याची पातळी दिसत आहे',
    issueAppCrash: 'अ‍ॅप बंद पडले',
    issueOther: 'दुसरी समस्या',
    reportSendWhatsApp: 'WhatsApp वर पाठवा',
    reportMsgGreeting: 'नमस्कार,\nमाझ्या WaterTank डिव्हाइसमध्ये समस्या आहे.',
    reportMsgIssue: 'समस्या',
    reportMsgTime: 'वेळ',
    reportMsgLog: 'डायग्नोस्टिक लॉग',
    fwUpdateTitle: 'फर्मवेयर अपडेट',
    fwDeviceFirmware: 'डिव्हाइस फर्मवेयर',
    fwAvailable: 'उपलब्ध',
    fwUpToDate: 'फर्मवेयर अद्ययावत आहे.',
    fwChangelog: 'बदल',
    fwDownloading: 'फर्मवेयर डाउनलोड होत आहे…',
    fwTransferring: 'फर्मवेयर हस्तांतरित होत आहे…',
    fwKeepClose: 'फोन 2 मीटर जवळ ठेवा. ॲप बंद करू नका.',
    fwRebooting: 'डिव्हाइस रीस्टार्ट होत आहे…',
    fwConfirming: 'अपडेट तपासत आहे…',
    fwRebootHint: 'डिव्हाइस सुमारे 10 सेकंदात पुन्हा जोडले जाईल.',
    fwConfirmHint: 'डिव्हाइसवर नवीन फर्मवेयर तपासत आहे.',
    fwDoneTitle: 'अपडेट पूर्ण झाले',
    fwDoneBody: 'डिव्हाइस आता फर्मवेयरवर चालत आहे',
    fwCancelledTitle: 'हस्तांतरण रद्द झाले',
    fwCancelledBody: 'डिव्हाइस अर्ध्या फ्लॅशमध्ये आहे. पुन्हा प्रयत्न करण्यापूर्वी डिव्हाइस बंद-चालू करा — ते जुन्या फर्मवेयरवर परत येईल.',
    fwCancelledWaiting: 'डिव्हाइस डिस्कनेक्ट होण्याची प्रतीक्षा…',
    fwErrorTitle: 'अपडेट अयशस्वी झाले',
    fwErrorFallback: 'अज्ञात त्रुटी आली.',
    fwErrorRollback: 'डिव्हाइस आपोआप जुन्या फर्मवेयरवर परत आले.',
    fwInstall: 'इन्स्टॉल करा',
    fwDone: 'झाले',
    fwRetry: 'पुन्हा प्रयत्न करा',
    fwTimeout60: '60 सेकंदांनंतरही डिव्हाइस जोडले नाही. डिव्हाइसची पॉवर तपासा आणि पुन्हा प्रयत्न करा.',
    municipalSupply: 'नगरपालिका पुरवठा',
    supplyOn: 'पाणी उपलब्ध आहे',
    supplyOff: 'इनलेटवर पाणी नाही',
    authEnterPassword: 'पासवर्ड टाका',
    authPasswordHint: 'नवीन डिव्हाइस सापडले. डीफॉल्ट पासवर्ड: 1234',
    authConnect: 'जोडा',
    authWrongPassword: 'चुकीचा पासवर्ड. पुन्हा प्रयत्न करा.',
    authConnecting: 'तपासत आहे…',
    setupTitle: 'डिव्हाइस सेट करा',
    setupSubtitle: 'तुमच्या WaterTank डिव्हाइससाठी नाव आणि नवीन पासवर्ड निवडा.',
    setupDeviceName: 'डिव्हाइसचे नाव',
    setupDeviceNamePlaceholder: 'WaterTank',
    setupNewPassword: 'नवीन पासवर्ड',
    setupConfirmPassword: 'पासवर्ड पुष्टी करा',
    setupPasswordMismatch: 'पासवर्ड जुळत नाहीत.',
    setupPasswordTooShort: 'पासवर्ड किमान 4 अक्षरांचा असावा.',
    setupSave: 'सेव्ह करा आणि जोडा',
    setupSaving: 'सेव्ह होत आहे…',
    pairedDevices: 'जोडलेले डिव्हाइस',
    allowNewPairing: 'नवीन डिव्हाइस जोडण्यास परवानगी द्या',
    pairingWindowOpen: 'पेअरिंग विंडो उघडी आहे',
    removeThisDevice: 'सर्व जोडलेले डिव्हाइस काढा',
    removeDeviceConfirmTitle: 'जोडलेले डिव्हाइस काढायचे?',
    removeDeviceConfirmMsg: 'या फोनला पुन्हा जोडण्यासाठी पासवर्ड टाकावा लागेल.',
    on: 'सुरू',
    off: 'बंद',
    errorTitle: 'काहीतरी चूक झाली',
    errorMessage: 'कृपया अ‍ॅप पुन्हा लोड करा.',
    errorTryAgain: 'पुन्हा प्रयत्न करा',
    errorDetails: 'त्रुटी तपशील',
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
    motorStatus: 'ಮೋಟಾರ್ ಸ್ಥಿತಿ',
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
    pressBootHint: 'ಇನ್ನೂ ಸಂಪರ್ಕ ಆಗಲಿಲ್ಲವೇ? ಸಾಧನದ ಬಟನ್ ಒಮ್ಮೆ ಒತ್ತಿ।',
    orTryDemo: 'ಅಥವಾ, ಡೆಮೊ ಪ್ರಯತ್ನಿಸಿ —',
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
    avgFillTime: 'ಸರಾಸರಿ ತುಂಬುವ ಸಮಯ',
    supplyWindow_morning: 'ನೀರು ಸಾಮಾನ್ಯವಾಗಿ ಬೆಳಿಗ್ಗೆ ಬರುತ್ತದೆ (5 AM – ಮಧ್ಯಾಹ್ನ)',
    supplyWindow_afternoon: 'ನೀರು ಸಾಮಾನ್ಯವಾಗಿ ಮಧ್ಯಾಹ್ನ ಬರುತ್ತದೆ (ಮಧ್ಯಾಹ್ನ – 5 PM)',
    supplyWindow_evening: 'ನೀರು ಸಾಮಾನ್ಯವಾಗಿ ಸಂಜೆ ಬರುತ್ತದೆ (5 PM – 9 PM)',
    supplyWindow_night: 'ನೀರು ಸಾಮಾನ್ಯವಾಗಿ ರಾತ್ರಿ ಬರುತ್ತದೆ (9 PM – 5 AM)',
    weeklyNoData: 'ಈ ವಾರ ಮೋಟಾರ್ ಚಾಲನೆಯಾಗಲಿಲ್ಲ',
    litres: 'ಲೀ',
    tankSizeLabel: 'ಟ್ಯಾಂಕ್ ಗಾತ್ರ',
    tankSizePlaceholder: '1000',
    configureTankSize: 'ಲೀಟರ್ ನೋಡಲು ಟ್ಯಾಂಕ್ ಗಾತ್ರವನ್ನು ಹೊಂದಿಸಿ',
    fillTargetLabel: 'ಸ್ವಯಂ-ನಿಲ್ಲಿಸುವ ಮಟ್ಟ',
    fillTargetHint: 'ಟ್ಯಾಂಕ್ ಈ ಮಟ್ಟಕ್ಕೆ ತಲುಪಿದಾಗ ಮೋಟಾರ್ ನಿಲ್ಲುತ್ತದೆ',
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
    setupGuide: 'ಹಾರ್ಡ್‌ವೇರ್ ಸೆಟಪ್ ಮಾರ್ಗದರ್ಶಿ',
    setupPage1: 'ಪೆಟ್ಟಿಗೆಯಲ್ಲಿ ಏನಿದೆ',
    setupPage2: 'ಸಿಸ್ಟಮ್ ಅವಲೋಕನ',
    setupPage3: 'ಅನುಸ್ಥಾಪನಾ ಹಂತಗಳು',
    setupHint: 'ಹಾರ್ಡ್‌ವೇರ್ ಸೆಟಪ್‌ಗೆ ಸಹಾಯ ಬೇಕೇ? ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಸೆಟಪ್ ಮಾರ್ಗದರ್ಶಿ ನೋಡಿ.',
    reportProblem: 'ಸಮಸ್ಯೆ ತಿಳಿಸಿ',
    reportSelectIssue: 'ಏನು ತಪ್ಪಾಯಿತು?',
    issueMotorNotStart: 'ಮೋಟಾರ್ ಚಾಲೂ ಆಗಲಿಲ್ಲ',
    issueWrongLevel: 'ತಪ್ಪು ನೀರಿನ ಮಟ್ಟ ತೋರಿಸುತ್ತಿದೆ',
    issueAppCrash: 'ಆ್ಯಪ್ ನಿಂತಿದೆ',
    issueOther: 'ಇನ್ನೊಂದು ಸಮಸ್ಯೆ',
    reportSendWhatsApp: 'WhatsApp ನಲ್ಲಿ ಕಳಿಸಿ',
    reportMsgGreeting: 'ನಮಸ್ಕಾರ,\nನನ್ನ WaterTank ಸಾಧನದಲ್ಲಿ ಸಮಸ್ಯೆ ಇದೆ.',
    reportMsgIssue: 'ಸಮಸ್ಯೆ',
    reportMsgTime: 'ಸಮಯ',
    reportMsgLog: 'ಡಯಾಗ್ನೋಸ್ಟಿಕ್ ಲಾಗ್',
    fwUpdateTitle: 'ಫರ್ಮ್‌ವೇರ್ ಅಪ್‌ಡೇಟ್',
    fwDeviceFirmware: 'ಸಾಧನ ಫರ್ಮ್‌ವೇರ್',
    fwAvailable: 'ಲಭ್ಯವಿದೆ',
    fwUpToDate: 'ಫರ್ಮ್‌ವೇರ್ ನವೀನವಾಗಿದೆ.',
    fwChangelog: 'ಬದಲಾವಣೆಗಳು',
    fwDownloading: 'ಫರ್ಮ್‌ವೇರ್ ಡೌನ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
    fwTransferring: 'ಫರ್ಮ್‌ವೇರ್ ವರ್ಗಾಯಿಸಲಾಗುತ್ತಿದೆ…',
    fwKeepClose: 'ಫೋನ್ ಅನ್ನು 2 ಮೀಟರ್ ಹತ್ತಿರ ಇಡಿ. ಆ್ಯಪ್ ಮುಚ್ಚಬೇಡಿ.',
    fwRebooting: 'ಸಾಧನ ರೀಸ್ಟಾರ್ಟ್ ಆಗುತ್ತಿದೆ…',
    fwConfirming: 'ಅಪ್‌ಡೇಟ್ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
    fwRebootHint: 'ಸಾಧನ ಸರಿಸುಮಾರು 10 ಸೆಕೆಂಡ್‌ಗಳಲ್ಲಿ ಮತ್ತೆ ಸಂಪರ್ಕಗೊಳ್ಳುತ್ತದೆ.',
    fwConfirmHint: 'ಸಾಧನದಲ್ಲಿ ಹೊಸ ಫರ್ಮ್‌ವೇರ್ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ.',
    fwDoneTitle: 'ಅಪ್‌ಡೇಟ್ ಪೂರ್ಣಗೊಂಡಿದೆ',
    fwDoneBody: 'ಸಾಧನ ಈಗ ಫರ್ಮ್‌ವೇರ್‌ನಲ್ಲಿ ಚಾಲನೆಯಲ್ಲಿದೆ',
    fwCancelledTitle: 'ವರ್ಗಾವಣೆ ರದ್ದುಗೊಂಡಿದೆ',
    fwCancelledBody: 'ಸಾಧನ ಅರ್ಧ ಫ್ಲ್ಯಾಶ್‌ನಲ್ಲಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸುವ ಮೊದಲು ಸಾಧನವನ್ನು ಆಫ್-ಆನ್ ಮಾಡಿ — ಅದು ಹಳೆಯ ಫರ್ಮ್‌ವೇರ್‌ಗೆ ಹಿಂದಿರುಗುತ್ತದೆ.',
    fwCancelledWaiting: 'ಸಾಧನ ಡಿಸ್‌ಕನೆಕ್ಟ್ ಆಗಲು ಕಾಯುತ್ತಿದೆ…',
    fwErrorTitle: 'ಅಪ್‌ಡೇಟ್ ವಿಫಲವಾಗಿದೆ',
    fwErrorFallback: 'ಅಜ್ಞಾತ ದೋಷ ಸಂಭವಿಸಿದೆ.',
    fwErrorRollback: 'ಸಾಧನ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಹಳೆಯ ಫರ್ಮ್‌ವೇರ್‌ಗೆ ಹಿಂದಿರುಗಿದೆ.',
    fwInstall: 'ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ',
    fwDone: 'ಮುಗಿಯಿತು',
    fwRetry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    fwTimeout60: '60 ಸೆಕೆಂಡ್ ನಂತರವೂ ಸಾಧನ ಸಂಪರ್ಕಗೊಳ್ಳಲಿಲ್ಲ. ಸಾಧನದ ಪವರ್ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    municipalSupply: 'ನಗರ ಪಾಲಿಕೆ ಪೂರೈಕೆ',
    supplyOn: 'ನೀರು ಲಭ್ಯವಿದೆ',
    supplyOff: 'ಇನ್‌ಲೆಟ್‌ನಲ್ಲಿ ನೀರಿಲ್ಲ',
    authEnterPassword: 'ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ',
    authPasswordHint: 'ಹೊಸ ಸಾಧನ ಸಿಕ್ಕಿದೆ. ಡೀಫಾಲ್ಟ್ ಪಾಸ್‌ವರ್ಡ್: 1234',
    authConnect: 'ಸಂಪರ್ಕಿಸಿ',
    authWrongPassword: 'ತಪ್ಪು ಪಾಸ್‌ವರ್ಡ್. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    authConnecting: 'ಪರಿಶೀಲಿಸುತ್ತಿದೆ…',
    setupTitle: 'ನಿಮ್ಮ ಸಾಧನ ಸೆಟಪ್ ಮಾಡಿ',
    setupSubtitle: 'WaterTank ಸಾಧನಕ್ಕೆ ಹೆಸರು ಮತ್ತು ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಆರಿಸಿ.',
    setupDeviceName: 'ಸಾಧನದ ಹೆಸರು',
    setupDeviceNamePlaceholder: 'WaterTank',
    setupNewPassword: 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
    setupConfirmPassword: 'ಪಾಸ್‌ವರ್ಡ್ ದೃಢೀಕರಿಸಿ',
    setupPasswordMismatch: 'ಪಾಸ್‌ವರ್ಡ್‌ಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.',
    setupPasswordTooShort: 'ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 4 ಅಕ್ಷರಗಳಿರಬೇಕು.',
    setupSave: 'ಉಳಿಸಿ ಮತ್ತು ಸಂಪರ್ಕಿಸಿ',
    setupSaving: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ…',
    pairedDevices: 'ಜೋಡಿಸಿದ ಸಾಧನಗಳು',
    allowNewPairing: 'ಹೊಸ ಸಾಧನ ಜೋಡಿಸಲು ಅನುಮತಿ ನೀಡಿ',
    pairingWindowOpen: 'ಪೇರಿಂಗ್ ವಿಂಡೋ ತೆರೆದಿದೆ',
    removeThisDevice: 'ಎಲ್ಲಾ ಜೋಡಿಸಿದ ಸಾಧನಗಳನ್ನು ತೆಗೆಯಿರಿ',
    removeDeviceConfirmTitle: 'ಜೋಡಿಸಿದ ಸಾಧನಗಳನ್ನು ತೆಗೆಯಬೇಕೇ?',
    removeDeviceConfirmMsg: 'ಈ ಫೋನ್ ಮತ್ತೆ ಸಂಪರ್ಕಿಸಲು ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಬೇಕಾಗುತ್ತದೆ.',
    on: 'ಆನ್',
    off: 'ಆಫ್',
    errorTitle: 'ಏನೋ ತಪ್ಪಾಗಿದೆ',
    errorMessage: 'ದಯವಿಟ್ಟು ಆ್ಯಪ್ ಅನ್ನು ಮರುಲೋಡ್ ಮಾಡಿ.',
    errorTryAgain: 'ಮರುಪ್ರಯತ್ನಿಸಿ',
    errorDetails: 'ದೋಷ ವಿವರಗಳು',
  },
};

// WaterTank BLE firmware — NimBLE-Arduino 2.x, v1.3.0
// Municipality motor controller + Tapo-style auth (app-level password + session tokens).
// SW_MANUAL wired in parallel with relay coil — zero electronics in manual path.
// GPIO_AUX (optocoupler) is ground truth for motor state; USE_SENSOR 0 = simulation.

#include <NimBLEDevice.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WFStorm.h>
#include "NimBLEOta.h"
#include <mbedtls/md.h>

#define USE_SENSOR 0   // 0=simulation, 1=real hardware

#define LED_PIN    2
#define GPIO_BOOT  0   // BOOT button — hold 10s for factory reset
#define SSID       "Neo6G"
#define PASS       "Passw01d"
#define FW_VERSION "1.3.0"

// GPIO (active when USE_SENSOR 1)
#define GPIO_RELAY  4
#define GPIO_AUX    34
#define GPIO_INLET  13
#define GPIO_TRIG   5
#define GPIO_ECHO   18

// Existing characteristics
#define SVC_UUID       "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define C_STATE        "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define C_TANK         "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define C_LOGCTRL      "beb54840-36e1-4688-b7f5-ea07361b26a8"
#define C_LOGDATA      "beb54841-36e1-4688-b7f5-ea07361b26a8"
#define C_TIMESYNC     "beb54842-36e1-4688-b7f5-ea07361b26a8"
#define C_FWVER        "beb54843-36e1-4688-b7f5-ea07361b26a8"
#define C_RESET_REASON "beb54844-36e1-4688-b7f5-ea07361b26a8"
#define C_FILL_TARGET  "beb54845-36e1-4688-b7f5-ea07361b26a8"
// Auth characteristics (Phase 1)
#define C_AUTH         "beb54846-36e1-4688-b7f5-ea07361b26a8"
#define C_SESSION      "beb54847-36e1-4688-b7f5-ea07361b26a8"
#define C_SETUP        "beb54848-36e1-4688-b7f5-ea07361b26a8"
#define C_VISIBILITY   "beb54849-36e1-4688-b7f5-ea07361b26a8"
#define C_CLAIMED      "beb5484a-36e1-4688-b7f5-ea07361b26a8"

#define NOTIFY_INTERVAL_MS    2000
#define NOTIFY_OTA_INTERVAL   10000
#define STALL_TIMEOUT_MS      12000
#define WIFI_CHECK_MS         30000
#define LOG_FRAME_MS          50
#define TICK_INTERVAL_MS      1000
#define DRAIN_STEP_PCT        0.3f
#define FILL_STEP_PCT         0.8f
#define LOW_TANK_PCT          20.0f
#define FULL_TANK_PCT_DEFAULT 90.0f
#define VISIBILITY_MS         (5UL * 60UL * 1000UL)  // 5-min window
#define SESSION_MAX           5
#define SESSION_LEN           16
#define FACTORY_RESET_MS      10000UL

// ── Event ring buffer ─────────────────────────────────────────────────────────

#define EVENT_BUF_SIZE 64
struct LogEvent { uint32_t id, epoch, durationSec; uint8_t type, stopReason; float tankPct; };
static LogEvent  eventBuf[EVENT_BUF_SIZE];
static uint8_t   eventHead  = 0;
static uint8_t   eventCount = 0;
static uint32_t  nextEventId = 1;

// ── State ─────────────────────────────────────────────────────────────────────

static NimBLECharacteristic *charState, *charTank, *charLogData, *charAuth, *charSession;
static NimBLEServer          *bleServer  = nullptr;
static NimBLEOta              bleOta;
static Preferences            prefs;
static float                  fullTankPct = FULL_TANK_PCT_DEFAULT;

static volatile bool bleConnected  = false;
static bool          doSendLogs    = false;
static unsigned long pushScheduled = 0;
static uint32_t      syncedEpoch   = 0;
static unsigned long lastNotify    = 0;
static unsigned long lastWifiCheck = 0;
static unsigned long lastTick      = 0;
static bool          otaActive     = false;
static bool          fwValidated   = false;

// Automation state
static float    tankPct         = 72.0f;
static int      pumpState       = 0;
static bool     motorOn         = false;
static bool     manualMode      = false;
static bool     relayOn         = false;
static bool     inletActive     = false;
static uint32_t motorStartEpoch = 0;

#if USE_SENSOR == 0
static bool simInletActive = false;
#endif

// Non-blocking log stream
static bool          logStreaming = false;
static int           logFrameIdx  = 0;
static unsigned long logFrameNext = 0;

// Auth state
static bool          claimed       = false;
static char          deviceName[32]= "WaterTank";
static uint8_t       passwordHash[32] = {};
static uint8_t       sessions[SESSION_MAX][SESSION_LEN] = {};
static uint8_t       sessionCount  = 0;
static bool          bleVisible    = true;   // true=advertising; false=silent
static unsigned long visibilityEnd = 0;      // millis() when 5-min window expires (0=off)
static bool          connAuthed    = false;  // true after successful auth on current connection
static unsigned long btnHoldStart  = 0;      // millis() when BOOT button press began

// ── SHA256 (mbedTLS, available on ESP32) ─────────────────────────────────────

static void sha256(const uint8_t* data, size_t len, uint8_t out[32]) {
  mbedtls_md_context_t ctx;
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
  mbedtls_md_starts(&ctx);
  mbedtls_md_update(&ctx, data, len);
  mbedtls_md_finish(&ctx, out);
  mbedtls_md_free(&ctx);
}

// ── NVS auth load ─────────────────────────────────────────────────────────────

static void nvsLoadAuth() {
  claimed = prefs.getBool("claimed", false);

  String n = prefs.getString("dev_name", "WaterTank");
  strncpy(deviceName, n.c_str(), sizeof(deviceName) - 1);
  deviceName[sizeof(deviceName) - 1] = 0;

  size_t got = prefs.getBytes("pw_hash", passwordHash, 32);
  if (got < 32) {
    // No hash stored — write factory default SHA256("1234")
    sha256((const uint8_t*)"1234", 4, passwordHash);
    prefs.putBytes("pw_hash", passwordHash, 32);
  }

  sessionCount = prefs.getUChar("sess_count", 0);
  if (sessionCount > SESSION_MAX) sessionCount = 0;
  prefs.getBytes("sessions", sessions, sizeof(sessions));

  // Unclaimed board advertises openly; claimed board is silent until owner enables
  bleVisible = !claimed;
}

// ── Session management ────────────────────────────────────────────────────────

static bool sessionFind(const uint8_t* token) {
  for (int i = 0; i < sessionCount; i++)
    if (memcmp(sessions[i], token, SESSION_LEN) == 0) return true;
  return false;
}

static void sessionAdd(const uint8_t* token) {
  if (sessionCount < SESSION_MAX) {
    memcpy(sessions[sessionCount++], token, SESSION_LEN);
  } else {
    // Evict oldest (index 0), shift left, add at end
    memmove(sessions[0], sessions[1], (SESSION_MAX - 1) * SESSION_LEN);
    memcpy(sessions[SESSION_MAX - 1], token, SESSION_LEN);
  }
  prefs.putBytes("sessions", sessions, sizeof(sessions));
  prefs.putUChar("sess_count", sessionCount);
}

static void sessionsClearAll() {
  memset(sessions, 0, sizeof(sessions));
  sessionCount = 0;
  prefs.putBytes("sessions", sessions, sizeof(sessions));
  prefs.putUChar("sess_count", 0);
}

static void genToken(uint8_t out[SESSION_LEN]) {
  for (int i = 0; i < SESSION_LEN; i++) out[i] = esp_random() & 0xFF;
}

// ── Auth characteristic callbacks ─────────────────────────────────────────────

// C_AUTH: client writes password (string) or session token (16 bytes).
// On success: C_SESSION holds a fresh 16-byte token; C_AUTH read = "OK" or "SETUP_REQUIRED".
// On failure: C_AUTH read = "FAIL".
class AuthCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    NimBLEAttValue v = c->getValue();
    bool ok = false;
    if (v.size() == SESSION_LEN) {
      ok = sessionFind(v.data());
    } else if (v.size() > 0) {
      uint8_t h[32];
      sha256(v.data(), v.size(), h);
      ok = (memcmp(h, passwordHash, 32) == 0);
    }
    if (ok) {
      uint8_t token[SESSION_LEN];
      genToken(token);
      sessionAdd(token);
      charSession->setValue(token, SESSION_LEN);
      connAuthed = true;
      const char* resp = claimed ? "OK" : "SETUP_REQUIRED";
      c->setValue((uint8_t*)resp, strlen(resp));
      Serial.printf("Auth: %s\n", resp);
    } else {
      c->setValue((uint8_t*)"FAIL", 4);
      connAuthed = false;
      Serial.println("Auth: FAIL");
    }
  }
};

// C_SETUP: write "DeviceName|NewPassword" (pipe-delimited).
// Requires prior auth. On success: saves name+hash, clears sessions, issues new token,
// sets claimed=true, stops advertising. Password change also clears all existing sessions.
class SetupCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    if (!connAuthed) { c->setValue((uint8_t*)"FAIL", 4); return; }
    NimBLEAttValue v = c->getValue();
    const char* data = (const char*)v.data();
    const char* sep  = (const char*)memchr(data, '|', v.size());
    if (!sep) { c->setValue((uint8_t*)"FAIL", 4); return; }
    size_t nameLen = sep - data;
    size_t pwLen   = v.size() - nameLen - 1;
    if (nameLen == 0 || nameLen >= sizeof(deviceName) || pwLen == 0) {
      c->setValue((uint8_t*)"FAIL", 4); return;
    }
    // Save device name
    memcpy(deviceName, data, nameLen);
    deviceName[nameLen] = 0;
    prefs.putString("dev_name", deviceName);
    // Hash and save new password; clear all sessions (F1.12)
    uint8_t h[32];
    sha256((const uint8_t*)(sep + 1), pwLen, h);
    memcpy(passwordHash, h, 32);
    prefs.putBytes("pw_hash", passwordHash, 32);
    sessionsClearAll();
    // Issue a fresh token so this connection stays authenticated
    uint8_t token[SESSION_LEN];
    genToken(token);
    sessionAdd(token);
    charSession->setValue(token, SESSION_LEN);
    // Mark claimed; keep advertising for 30s so the paired device can verify connection
    claimed       = true;
    bleVisible    = true;
    visibilityEnd = millis() + 30000UL;
    prefs.putBool("claimed", true);
    // Update scan response name; restart advertising with new name
    NimBLEAdvertisementData scanRsp;
    scanRsp.setName(deviceName);
    NimBLEDevice::getAdvertising()->setScanResponseData(scanRsp);
    NimBLEDevice::startAdvertising();
    c->setValue((uint8_t*)"OK", 2);
    Serial.printf("Setup: name='%s' claimed=true (30s visibility window)\n", deviceName);
  }
};

// C_VISIBILITY: write 0x01 to open a 5-min advertising window, 0x00 to close immediately.
// Requires auth. Any paired user can control visibility.
class VisibilityCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    if (!connAuthed) return;
    NimBLEAttValue v = c->getValue();
    if (v.size() == 0) return;
    bool on = (v.data()[0] != 0);
    bleVisible = on;
    if (on) {
      visibilityEnd = millis() + VISIBILITY_MS;
      if (!bleConnected) NimBLEDevice::startAdvertising();
      Serial.println("Visibility: ON (5 min)");
    } else {
      visibilityEnd = 0;
      if (!bleConnected) NimBLEDevice::stopAdvertising();
      Serial.println("Visibility: OFF");
    }
  }
};

// C_CLAIMED: read-only; 0x00 = factory state, 0x01 = claimed.
class ClaimedCB : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    uint8_t v = claimed ? 1 : 0;
    c->setValue(&v, 1);
  }
};

// ── Existing BLE callbacks ────────────────────────────────────────────────────

class ConnCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*, NimBLEConnInfo& info) override {
    bleConnected  = true;
    pushScheduled = millis() + 800;
    lastNotify    = millis();
    Serial.printf("BLE: connected — peer=%s\n", info.getAddress().toString().c_str());
  }
  void onDisconnect(NimBLEServer*, NimBLEConnInfo& info, int reason) override {
    bleConnected  = false;
    connAuthed    = false;
    logStreaming  = false;
    logFrameIdx   = 0;
    lastNotify    = 0;
    pushScheduled = 0;
    Serial.printf("BLE: disconnected (reason=0x%02X)\n", reason);
    // advertiseOnDisconnect(true) will restart advertising automatically;
    // loop() suppresses it immediately if claimed and not visible.
  }
};

class TimeSyncCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    NimBLEAttValue v = c->getValue();
    if (v.size() >= 4) {
      const uint8_t* d = v.data();
      syncedEpoch = (uint32_t)d[0] | ((uint32_t)d[1]<<8)
                  | ((uint32_t)d[2]<<16) | ((uint32_t)d[3]<<24);
      Serial.printf("TimeSync: epoch=%u\n", syncedEpoch);
    }
  }
};

class LogCtrlCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    NimBLEAttValue v = c->getValue();
    if (v.size() > 0) {
      uint8_t cmd = v.data()[0];
      if (cmd == 0x01) { doSendLogs = true; logFrameIdx = 0; Serial.println("LogCtrl: START"); }
      else if (cmd == 0x02) { Serial.println("LogCtrl: ACK"); }
    }
  }
};

class FillTargetCB : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    char buf[8]; snprintf(buf, sizeof(buf), "%d", (int)fullTankPct);
    c->setValue(buf);
  }
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    NimBLEAttValue v = c->getValue();
    if (v.size() == 0) return;
    int pct = atoi((const char*)v.data());
    pct = constrain(pct, 1, 98);
    fullTankPct = (float)pct;
    prefs.putFloat("fill_pct", fullTankPct);
    Serial.printf("FillTarget: set to %d%%\n", pct);
  }
};

// ── BLE OTA callbacks ─────────────────────────────────────────────────────────

class OtaCB : public NimBLEOtaCallbacks {
  void onStart(NimBLEOta*, uint32_t size, NimBLEOta::Reason reason) override {
    Serial.printf("BLE-OTA: start size=%u reason=%d\n", size, reason);
    otaActive = true;
  }
  void onProgress(NimBLEOta*, uint32_t cur, uint32_t total) override {
    Serial.printf("BLE-OTA: %u/%u (%.0f%%)\n", cur, total, 100.f * cur / total);
  }
  void onStop(NimBLEOta*, NimBLEOta::Reason reason) override {
    Serial.printf("BLE-OTA: stopped reason=%d\n", reason); otaActive = false;
  }
  void onComplete(NimBLEOta*) override {
    Serial.println("BLE-OTA: complete — rebooting in 2s"); delay(2000); esp_restart();
  }
  void onError(NimBLEOta*, esp_err_t err, NimBLEOta::Reason reason) override {
    Serial.printf("BLE-OTA: error 0x%x reason=%d\n", err, reason); otaActive = false;
  }
};

// ── Relay + sensor abstraction ────────────────────────────────────────────────

void setRelay(bool on) {
  relayOn = on;
#if USE_SENSOR == 1
  digitalWrite(GPIO_RELAY, on ? HIGH : LOW);
#endif
}

bool getAux() {
#if USE_SENSOR == 1
  return digitalRead(GPIO_AUX) == HIGH;
#else
  return relayOn;
#endif
}

bool getInlet() {
#if USE_SENSOR == 1
  return digitalRead(GPIO_INLET) == LOW;
#else
  if (tankPct >= fullTankPct) simInletActive = false;
  if (tankPct <= LOW_TANK_PCT) simInletActive = true;
  return simInletActive;
#endif
}

float getTankLevel() {
#if USE_SENSOR == 1
  return tankPct;  // TODO: JSN-SR04T (F-SENSOR milestone)
#else
  if (relayOn) tankPct = constrain(tankPct + FILL_STEP_PCT, 0.0f, 100.0f);
  else         tankPct = constrain(tankPct - DRAIN_STEP_PCT, 0.0f, 100.0f);
  return tankPct;
#endif
}

// ── Event logging ─────────────────────────────────────────────────────────────

void pushEvent(uint8_t type, float tank, uint32_t dur, uint8_t stop) {
  LogEvent& e   = eventBuf[eventHead];
  e.id          = nextEventId++;
  e.epoch       = syncedEpoch > 0 ? syncedEpoch : (millis() / 1000);
  e.type        = type;
  e.tankPct     = tank;
  e.durationSec = dur;
  e.stopReason  = stop;
  eventHead = (eventHead + 1) % EVENT_BUF_SIZE;
  if (eventCount < EVENT_BUF_SIZE) eventCount++;
}

// ── Automation state machine ──────────────────────────────────────────────────

void tickAutomation() {
  tankPct     = getTankLevel();
  bool aux    = getAux();
  bool inlet  = getInlet();
  inletActive = inlet;

  if (aux && !relayOn) {
    if (!manualMode) { manualMode=true; pumpState=5; motorOn=true; pushEvent(4,tankPct,0,0); Serial.println("AUTO: MANUAL_ON"); }
    return;
  }
  if (!aux && relayOn) {
    manualMode=false; setRelay(false); motorOn=false; pumpState=0;
    pushEvent(5,tankPct,0,0); Serial.println("AUTO: MANUAL_OFF");
  }
  if (manualMode && !aux) { manualMode=false; pumpState=0; motorOn=false; }
  if (manualMode) return;

  if (!aux) {
    motorOn = false;
    if (inlet && tankPct < fullTankPct) {
      setRelay(true); pumpState=3; motorOn=true;
      motorStartEpoch = syncedEpoch>0 ? syncedEpoch : (millis()/1000);
      pushEvent(1,tankPct,0,0);
      Serial.printf("AUTO: MOTOR_ON inlet=1 tank=%.1f%%\n", tankPct);
    } else if (!inlet && pumpState==3) { pumpState=0; }
  } else {
    bool shouldStop=false; uint8_t stopReason=0;
    if (!inlet)              { shouldStop=true; stopReason=2; }
    else if (tankPct>=fullTankPct) { shouldStop=true; stopReason=1; }
    if (shouldStop) {
      uint32_t now=syncedEpoch>0?syncedEpoch:(millis()/1000);
      uint32_t dur=motorStartEpoch>0&&now>motorStartEpoch?now-motorStartEpoch:0;
      setRelay(false); motorOn=false; pumpState=(stopReason==1)?4:0;
      pushEvent(2,tankPct,dur,stopReason);
      Serial.printf("AUTO: MOTOR_OFF stop=%d tank=%.1f%%\n", stopReason, tankPct);
    }
  }
}

// ── Non-blocking log stream ───────────────────────────────────────────────────

void loopLogStream() {
  if (!logStreaming && !doSendLogs) return;
  if (!bleConnected || !charLogData) { logStreaming=false; return; }
  if (doSendLogs) { doSendLogs=false; logStreaming=true; logFrameIdx=0; logFrameNext=millis()+LOG_FRAME_MS; return; }
  if (millis() < logFrameNext) return;
  logFrameNext = millis() + LOG_FRAME_MS;
  if (logFrameIdx < (int)eventCount) {
    uint8_t start = (eventHead + EVENT_BUF_SIZE - eventCount) % EVENT_BUF_SIZE;
    uint8_t idx   = (start + (uint8_t)logFrameIdx) % EVENT_BUF_SIZE;
    const LogEvent& e = eventBuf[idx];
    char buf[144];
    snprintf(buf, sizeof(buf), "{\"id\":%u,\"t\":%u,\"type\":%d,\"tank\":%.0f,\"dur\":%u,\"stop\":%d}",
             e.id, e.epoch, e.type, e.tankPct, e.durationSec, e.stopReason);
    charLogData->setValue((uint8_t*)buf, strlen(buf));
    charLogData->notify();
    logFrameIdx++;
  } else {
    charLogData->setValue("DONE");
    charLogData->notify();
    logStreaming = false;
    Serial.printf("Log: DONE (%d events)\n", eventCount);
  }
}

// ── Notify helper ─────────────────────────────────────────────────────────────

void pushState() {
  if (!bleConnected || !charState || !charTank) return;
  char buf[128];
  snprintf(buf, sizeof(buf),
    "{\"state\":%d,\"motor\":%s,\"manual\":%s,\"tank\":%.1f,\"inlet\":%s}",
    pumpState, motorOn?"true":"false", manualMode?"true":"false",
    tankPct, inletActive?"true":"false");
  charState->setValue((uint8_t*)buf, strlen(buf));
  charState->notify();
  snprintf(buf, sizeof(buf), "%.1f", tankPct);
  charTank->setValue((uint8_t*)buf, strlen(buf));
  charTank->notify();
  lastNotify = millis();
  digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  if (!fwValidated) {
    esp_ota_mark_app_valid_cancel_rollback();
    fwValidated = true;
    Serial.printf("OTA: firmware v%s validated\n", FW_VERSION);
  }
}

// ── WiFi watchdog ─────────────────────────────────────────────────────────────

void checkWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("WiFi: lost — reconnecting");
  WiFi.disconnect();
  WiFi.begin(SSID, PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis()-t0 < 8000) {
    delay(200); digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }
  digitalWrite(LED_PIN, LOW);  // reset: reconnect loop may leave LED in any state
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi: back — IP=%s\n", WiFi.localIP().toString().c_str());
    wfConfigOTA(SSID, PASS, WF_STATION);
  } else {
    Serial.println("WiFi: reconnect failed");
  }
}

// ── setup ─────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(GPIO_BOOT, INPUT_PULLUP);

  // 8 fast blinks — confirms WaterTank firmware boot
  for (int i = 0; i < 8; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
  }

#if USE_SENSOR == 1
  pinMode(GPIO_RELAY, OUTPUT);  digitalWrite(GPIO_RELAY, LOW);
  pinMode(GPIO_AUX,   INPUT_PULLDOWN);
  pinMode(GPIO_INLET, INPUT_PULLUP);
  pinMode(GPIO_TRIG,  OUTPUT);  digitalWrite(GPIO_TRIG, LOW);
  pinMode(GPIO_ECHO,  INPUT);
  Serial.println("Sensor: GPIO init done");
#endif

  prefs.begin("watertank", false);
  fullTankPct = constrain(prefs.getFloat("fill_pct", FULL_TANK_PCT_DEFAULT), 1.0f, 98.0f);
  nvsLoadAuth();
  Serial.printf("Auth: claimed=%s name='%s' sessions=%d\n",
                claimed?"yes":"no", deviceName, sessionCount);

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500); digitalWrite(LED_PIN, !digitalRead(LED_PIN)); tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi: connected — IP=%s\n", WiFi.localIP().toString().c_str());
    digitalWrite(LED_PIN, HIGH); delay(500); digitalWrite(LED_PIN, LOW);
    wfConfigOTA(SSID, PASS, WF_STATION);
  } else {
    Serial.println("WiFi: failed — OTA via AP 'StormBoard'");
    wfConfigOTA("StormBoard", "esp32ota", WF_AP);
  }

  // BLE channel encryption — Just Works bonding (transparent to user)
  NimBLEDevice::setSecurityAuth(true, false, true);  // bonding, no MITM, secure connections
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);

  NimBLEDevice::init(deviceName);
  NimBLEDevice::setMTU(512);

  bleServer = NimBLEDevice::createServer();
  bleServer->setCallbacks(new ConnCB());
  bleServer->advertiseOnDisconnect(true);  // guards NimBLE 2.x bug #886/#915

  NimBLEService* svc = bleServer->createService(SVC_UUID);

  // Existing characteristics
  charState = svc->createCharacteristic(C_STATE, NIMBLE_PROPERTY::NOTIFY);
  charTank  = svc->createCharacteristic(C_TANK,  NIMBLE_PROPERTY::NOTIFY);

  NimBLECharacteristic* logCtrl = svc->createCharacteristic(
    C_LOGCTRL, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  logCtrl->setCallbacks(new LogCtrlCB());

  charLogData = svc->createCharacteristic(C_LOGDATA, NIMBLE_PROPERTY::NOTIFY);

  NimBLECharacteristic* timeSync = svc->createCharacteristic(
    C_TIMESYNC, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  timeSync->setCallbacks(new TimeSyncCB());

  NimBLECharacteristic* fwVer = svc->createCharacteristic(C_FWVER, NIMBLE_PROPERTY::READ);
  fwVer->setValue(FW_VERSION);

  NimBLECharacteristic* rstReason = svc->createCharacteristic(C_RESET_REASON, NIMBLE_PROPERTY::READ);
  uint8_t rstCode = (uint8_t)esp_reset_reason();
  rstReason->setValue(&rstCode, 1);

  NimBLECharacteristic* fillTarget = svc->createCharacteristic(
    C_FILL_TARGET, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE);
  fillTarget->setCallbacks(new FillTargetCB());
  char ftBuf[8];
  snprintf(ftBuf, sizeof(ftBuf), "%d", (int)fullTankPct);
  fillTarget->setValue(ftBuf);

  // Auth characteristics
  charAuth = svc->createCharacteristic(
    C_AUTH, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::READ);
  charAuth->setCallbacks(new AuthCB());
  charAuth->setValue((uint8_t*)"", 0);

  charSession = svc->createCharacteristic(C_SESSION, NIMBLE_PROPERTY::READ);
  charSession->setValue((uint8_t*)"", 0);

  NimBLECharacteristic* setup = svc->createCharacteristic(
    C_SETUP, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::READ);
  setup->setCallbacks(new SetupCB());
  setup->setValue((uint8_t*)"", 0);

  NimBLECharacteristic* vis = svc->createCharacteristic(
    C_VISIBILITY, NIMBLE_PROPERTY::WRITE);
  vis->setCallbacks(new VisibilityCB());

  NimBLECharacteristic* clmd = svc->createCharacteristic(C_CLAIMED, NIMBLE_PROPERTY::READ);
  clmd->setCallbacks(new ClaimedCB());

  svc->start();

  bleOta.start(new OtaCB());
  bleOta.startAbortTimer(300);

  // Advertising: service UUID in adv packet, device name in scan response
  NimBLEAdvertisementData scanRsp;
  scanRsp.setName(deviceName);
  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SVC_UUID);
  adv->enableScanResponse(true);
  adv->setScanResponseData(scanRsp);

  if (bleVisible) {
    adv->start();
    Serial.printf("BLE: advertising as '%s' v%s\n", deviceName, FW_VERSION);
  } else {
    Serial.printf("BLE: silent (claimed, visibility off) '%s' v%s\n", deviceName, FW_VERSION);
  }
}

// ── loop ──────────────────────────────────────────────────────────────────────

void loop() {
  wfHandleOTA();
  unsigned long now = millis();

  // ── Factory reset: hold BOOT button for 10s ──────────────────────────────
  if (digitalRead(GPIO_BOOT) == LOW) {
    if (btnHoldStart == 0) btnHoldStart = now;
    else if (now - btnHoldStart >= FACTORY_RESET_MS) {
      Serial.println("Factory reset: clearing NVS + bonds, restarting");
      prefs.clear();
      NimBLEDevice::deleteAllBonds();
      delay(500);
      esp_restart();
    }
  } else {
    if (btnHoldStart > 0) {
      unsigned long holdMs = now - btnHoldStart;
      // Short press (0.5s–10s): open a 60s visibility window so the app can reconnect
      // without a full factory reset (e.g. after the user cleared app data).
      if (holdMs >= 500 && holdMs < FACTORY_RESET_MS) {
        bleVisible    = true;
        visibilityEnd = now + 60000UL;
        if (!bleConnected) NimBLEDevice::startAdvertising();
        Serial.printf("Visibility: BOOT short-press (%lums) -> 60s window\n", holdMs);
      }
    }
    btnHoldStart = 0;
  }

  // ── Visibility window expiry ─────────────────────────────────────────────
  if (visibilityEnd > 0 && now >= visibilityEnd) {
    visibilityEnd = 0;
    bleVisible    = false;
    if (!bleConnected) {
      NimBLEDevice::stopAdvertising();
      Serial.println("Visibility: window expired");
    }
  }

  // ── Suppress advertising when claimed + not visible ──────────────────────
  // advertiseOnDisconnect(true) can restart advertising; this stops it within one loop tick.
  if (claimed && !bleVisible && !bleConnected) {
    NimBLEDevice::stopAdvertising();
  }

  // ── Automation tick ──────────────────────────────────────────────────────
  if (now - lastTick >= TICK_INTERVAL_MS) {
    lastTick = now;
    tickAutomation();
  }

  if (pushScheduled > 0 && now >= pushScheduled && bleConnected) {
    pushScheduled = 0;
    pushState();
    lastNotify = now;
  }

  loopLogStream();

  if (now - lastWifiCheck >= WIFI_CHECK_MS) {
    lastWifiCheck = now;
    checkWifi();
  }

  // ── Stall watchdog ───────────────────────────────────────────────────────
  if (bleConnected && lastNotify > 0 && (now - lastNotify) > STALL_TIMEOUT_MS) {
    Serial.println("Watchdog: stall detected — forcing re-advertise");
    bleConnected = false;
    connAuthed   = false;
    logStreaming  = false;
    NimBLEDevice::stopAdvertising();
    delay(100);
    if (!claimed || bleVisible) NimBLEDevice::startAdvertising();
    lastNotify = now;
  }

  unsigned long interval = otaActive ? NOTIFY_OTA_INTERVAL : NOTIFY_INTERVAL_MS;
  if (bleConnected && (now - lastNotify) >= interval) {
    pushState();
    Serial.printf("Tick: state=%d motor=%s inlet=%s tank=%.1f%%\n",
                  pumpState, motorOn?"ON":"OFF", inletActive?"ON":"OFF", tankPct);
  }
}

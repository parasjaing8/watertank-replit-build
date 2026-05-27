// WaterTank BLE firmware — NimBLE-Arduino 2.x, v1.2.0
// Municipality motor controller: starts on inlet water detection, stops on tank full or supply cut.
// SW_MANUAL wired in parallel with relay coil — zero electronics in manual path.
// GPIO_AUX (optocoupler) is ground truth for motor state; USE_SENSOR 0 = simulation.

#include <NimBLEDevice.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WFStorm.h>
#include "NimBLEOta.h"

#define USE_SENSOR 0   // 0=simulation, 1=real hardware

#define LED_PIN    2
#define SSID       "Neo6G"
#define PASS       "Passw01d"
#define FW_VERSION "1.2.0"

// GPIO (active when USE_SENSOR 1)
#define GPIO_RELAY  4     // OUTPUT: contactor coil
#define GPIO_AUX    34    // INPUT_PULLDOWN: optocoupler (HIGH=contactor closed)
#define GPIO_INLET  13    // INPUT_PULLUP: float switch (LOW=water present)
#define GPIO_TRIG   5     // JSN-SR04T trigger
#define GPIO_ECHO   18    // JSN-SR04T echo

#define SVC_UUID       "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define C_STATE        "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define C_TANK         "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define C_LOGCTRL      "beb54840-36e1-4688-b7f5-ea07361b26a8"
#define C_LOGDATA      "beb54841-36e1-4688-b7f5-ea07361b26a8"
#define C_TIMESYNC     "beb54842-36e1-4688-b7f5-ea07361b26a8"
#define C_FWVER        "beb54843-36e1-4688-b7f5-ea07361b26a8"
#define C_RESET_REASON "beb54844-36e1-4688-b7f5-ea07361b26a8"
#define C_FILL_TARGET  "beb54845-36e1-4688-b7f5-ea07361b26a8"

#define NOTIFY_INTERVAL_MS    2000
#define NOTIFY_OTA_INTERVAL   10000
#define STALL_TIMEOUT_MS      12000
#define WIFI_CHECK_MS         30000
#define LOG_FRAME_MS          50
#define TICK_INTERVAL_MS      1000    // automation state machine tick
#define DRAIN_STEP_PCT        0.3f
#define FILL_STEP_PCT         0.8f
#define LOW_TANK_PCT          20.0f
#define FULL_TANK_PCT_DEFAULT 90.0f

// ── Event ring buffer ─────────────────────────────────────────────────────────

#define EVENT_BUF_SIZE 64

struct LogEvent { uint32_t id, epoch, durationSec; uint8_t type, stopReason; float tankPct; };

static LogEvent eventBuf[EVENT_BUF_SIZE];
static uint8_t  eventHead   = 0;
static uint8_t  eventCount  = 0;
static uint32_t nextEventId = 1;

// ── State ─────────────────────────────────────────────────────────────────────

static NimBLECharacteristic *charState, *charTank, *charLogData;
static NimBLEServer          *bleServer = nullptr;
static NimBLEOta              bleOta;
static Preferences            prefs;
static float                  fullTankPct = FULL_TANK_PCT_DEFAULT;

static volatile bool bleConnected   = false;
static bool          doSendLogs    = false;
static unsigned long pushScheduled = 0;
static uint32_t      syncedEpoch  = 0;
static unsigned long lastNotify   = 0;
static unsigned long lastWifiCheck = 0;
static unsigned long lastTick     = 0;
static bool          otaActive    = false;
static bool          fwValidated  = false;

// Automation state
static float    tankPct         = 72.0f;
static int      pumpState       = 0;    // 0=idle,3=running,4=tank_full,5=manual
static bool     motorOn         = false;
static bool     manualMode      = false;
static bool     relayOn         = false;
static bool     inletActive     = false;
static uint32_t motorStartEpoch = 0;

// Simulation-only state (compiled out when USE_SENSOR 1)
#if USE_SENSOR == 0
static bool simInletActive = false;
#endif

// Non-blocking log stream
static bool          logStreaming = false;
static int           logFrameIdx = 0;
static unsigned long logFrameNext = 0;

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
  return relayOn;  // sim: contactor mirrors relay
#endif
}

bool getInlet() {
#if USE_SENSOR == 1
  return digitalRead(GPIO_INLET) == LOW;  // active LOW
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
  LogEvent& e  = eventBuf[eventHead];
  e.id         = nextEventId++;
  e.epoch      = syncedEpoch > 0 ? syncedEpoch : (millis() / 1000);
  e.type       = type;
  e.tankPct    = tank;
  e.durationSec = dur;
  e.stopReason = stop;
  eventHead = (eventHead + 1) % EVENT_BUF_SIZE;
  if (eventCount < EVENT_BUF_SIZE) eventCount++;
}

// ── Automation state machine ──────────────────────────────────────────────────

void tickAutomation() {
  tankPct     = getTankLevel();
  bool aux    = getAux();
  bool inlet  = getInlet();
  inletActive = inlet;

  // Manual override: aux (actual contactor) is ground truth, not relayOn
  if (aux && !relayOn) {
    // Contactor closed but we didn't command it → user used SW_MANUAL
    if (!manualMode) {
      manualMode = true;
      pumpState  = 5;
      motorOn    = true;
      pushEvent(4, tankPct, 0, 0);  // MANUAL_ON
      Serial.println("AUTO: MANUAL_ON");
    }
    return;
  }
  if (!aux && relayOn) {
    // Contactor opened while relay commanded ON → user opened SW_MANUAL mid-run
    manualMode = false;
    setRelay(false);
    motorOn    = false;
    pumpState  = 0;
    pushEvent(5, tankPct, 0, 0);  // MANUAL_OFF
    Serial.println("AUTO: MANUAL_OFF");
  }
  if (manualMode && !aux) {
    // SW_MANUAL was released — exit manual mode
    manualMode = false;
    pumpState  = 0;
    motorOn    = false;
  }
  if (manualMode) return;

  // Normal automation
  if (!aux) {
    motorOn = false;
    if (inlet && tankPct < fullTankPct) {
      setRelay(true);
      pumpState       = 3;
      motorOn         = true;
      motorStartEpoch = syncedEpoch > 0 ? syncedEpoch : (millis() / 1000);
      pushEvent(1, tankPct, 0, 0);  // MOTOR_ON
      Serial.printf("AUTO: MOTOR_ON inlet=1 tank=%.1f%%\n", tankPct);
    } else if (!inlet && pumpState == 3) {
      pumpState = 0;
    }
  } else {
    // Motor is running — check stop conditions (whichever first)
    bool    shouldStop = false;
    uint8_t stopReason = 0;
    if (!inlet) {
      shouldStop = true; stopReason = 2;  // SUPPLY_CUT
    } else if (tankPct >= fullTankPct) {
      shouldStop = true; stopReason = 1;  // TANK_FULL
    }
    if (shouldStop) {
      uint32_t now = syncedEpoch > 0 ? syncedEpoch : (millis() / 1000);
      uint32_t dur = motorStartEpoch > 0 && now > motorStartEpoch ? now - motorStartEpoch : 0;
      setRelay(false);
      motorOn   = false;
      pumpState = (stopReason == 1) ? 4 : 0;
      pushEvent(2, tankPct, dur, stopReason);  // MOTOR_OFF
      Serial.printf("AUTO: MOTOR_OFF stop=%d tank=%.1f%%\n", stopReason, tankPct);
    }
  }
}

// ── BLE callbacks ─────────────────────────────────────────────────────────────

class ConnCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*, NimBLEConnInfo& info) override {
    bleConnected  = true;
    pushScheduled = millis() + 800;
    lastNotify    = millis();
    Serial.printf("BLE: connected — peer=%s\n", info.getAddress().toString().c_str());
  }
  void onDisconnect(NimBLEServer*, NimBLEConnInfo& info, int reason) override {
    bleConnected  = false;
    logStreaming  = false;
    logFrameIdx   = 0;
    lastNotify    = 0;
    pushScheduled = 0;
    Serial.printf("BLE: disconnected (reason=0x%02X)\n", reason);
    NimBLEDevice::startAdvertising();
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
      if (cmd == 0x01) {
        doSendLogs  = true;
        logFrameIdx = 0;
        Serial.println("LogCtrl: START");
      } else if (cmd == 0x02) {
        Serial.println("LogCtrl: ACK");
      }
    }
  }
};

class FillTargetCB : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    char buf[8];
    snprintf(buf, sizeof(buf), "%d", (int)fullTankPct);
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
  void onProgress(NimBLEOta*, uint32_t current, uint32_t total) override {
    Serial.printf("BLE-OTA: %u/%u (%.0f%%)\n", current, total, 100.f * current / total);
  }
  void onStop(NimBLEOta*, NimBLEOta::Reason reason) override {
    Serial.printf("BLE-OTA: stopped reason=%d\n", reason);
    otaActive = false;
  }
  void onComplete(NimBLEOta*) override {
    Serial.println("BLE-OTA: complete — rebooting in 2s");
    delay(2000);
    esp_restart();
  }
  void onError(NimBLEOta*, esp_err_t err, NimBLEOta::Reason reason) override {
    Serial.printf("BLE-OTA: error 0x%x reason=%d\n", err, reason);
    otaActive = false;
  }
};

// ── Non-blocking log stream ───────────────────────────────────────────────────

void loopLogStream() {
  if (!logStreaming && !doSendLogs) return;
  if (!bleConnected || !charLogData) { logStreaming = false; return; }

  if (doSendLogs) {
    doSendLogs   = false;
    logStreaming  = true;
    logFrameIdx   = 0;
    logFrameNext  = millis() + LOG_FRAME_MS;
    return;
  }

  if (millis() < logFrameNext) return;
  logFrameNext = millis() + LOG_FRAME_MS;

  if (logFrameIdx < (int)eventCount) {
    // Iterate ring buffer from oldest to newest
    uint8_t start = (eventHead + EVENT_BUF_SIZE - eventCount) % EVENT_BUF_SIZE;
    uint8_t idx   = (start + (uint8_t)logFrameIdx) % EVENT_BUF_SIZE;
    const LogEvent& e = eventBuf[idx];
    char buf[144];
    snprintf(buf, sizeof(buf),
      "{\"id\":%u,\"t\":%u,\"type\":%d,\"tank\":%.0f,\"dur\":%u,\"stop\":%d}",
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
    pumpState,
    motorOn     ? "true" : "false",
    manualMode  ? "true" : "false",
    tankPct,
    inletActive ? "true" : "false");
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
    delay(200);
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }
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

  // 8 fast blinks — confirms WaterTank firmware (not stock OTA firmware)
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
  Serial.printf("FillTarget: loaded %.0f%% from NVS\n", fullTankPct);

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

  NimBLEDevice::init("WaterTank");
  NimBLEDevice::setMTU(512);

  bleServer = NimBLEDevice::createServer();
  bleServer->setCallbacks(new ConnCB());
  // Guards against NimBLE 2.x bug #886/#915 (onDisconnect stops firing after unclean disconnects)
  bleServer->advertiseOnDisconnect(true);  // guards NimBLE 2.x bug #886/#915

  NimBLEService* svc = bleServer->createService(SVC_UUID);

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

  svc->start();

  bleOta.start(new OtaCB());
  bleOta.startAbortTimer(300);

  NimBLEAdvertisementData scanRsp;
  scanRsp.setName("WaterTank");

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SVC_UUID);
  adv->enableScanResponse(true);
  adv->setScanResponseData(scanRsp);
  adv->start();

  Serial.printf("BLE: advertising v%s. tank=%.0f%% inlet=%s\n",
                FW_VERSION, tankPct, inletActive ? "ON" : "OFF");
}

// ── loop ──────────────────────────────────────────────────────────────────────

void loop() {
  wfHandleOTA();

  unsigned long now = millis();

  // Automation tick every 1s (independent of BLE notify rate)
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

  // Stall watchdog: bleConnected may be stuck true if onDisconnect never fires (NimBLE 2.x bug)
  if (bleConnected && lastNotify > 0 && (now - lastNotify) > STALL_TIMEOUT_MS) {
    Serial.println("Watchdog: stall detected — forcing re-advertise");
    bleConnected = false;
    logStreaming  = false;
    NimBLEDevice::stopAdvertising();
    delay(100);
    NimBLEDevice::startAdvertising();
    lastNotify = now;
  }

  unsigned long interval = otaActive ? NOTIFY_OTA_INTERVAL : NOTIFY_INTERVAL_MS;
  if (bleConnected && (now - lastNotify) >= interval) {
    pushState();
    Serial.printf("Tick: state=%d motor=%s inlet=%s tank=%.1f%%\n",
                  pumpState, motorOn?"ON":"OFF", inletActive?"ON":"OFF", tankPct);
  }
}

// WaterTank BLE firmware — NimBLE-Arduino 2.x
// Implements the 5-characteristic GATT protocol from constants/ble.ts.
// WiFi OTA stays active via wfHandleOTA() in loop() (dev builds only).
// BLE OTA via NimBLEOta (h2zero) — supports remote firmware update over BLE.
//
// Research-hardened (2026-05-26):
//  - srv->advertiseOnDisconnect(true) guards against NimBLE 2.x bug #886/#915
//  - OTA back-off: slow BLE notify to 10s when WiFi OTA is actively running
//  - Connection stall watchdog: re-advertises if bleConnected but no notify in 12s
//  - Non-blocking log stream (millis-based, no blocking delay())
//  - WiFi watchdog with reconnect loop in main loop()
//  - Tank simulation cycle for sensor-free testing
//
// BLE OTA (2026-05-26):
//  - NimBLEOta adds GATT service 0x8018 with RECV_FW (0x8020) + COMMAND (0x8022)
//  - Resume on reconnect is built-in (NimBLEOta::Reconnected reason)
//  - esp_ota_mark_app_valid_cancel_rollback() called after first successful notify
//  - C_FWVER characteristic (READ) exposes FW_VERSION string for app version checks

#include <NimBLEDevice.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WFStorm.h>
#include "NimBLEOta.h"

#define LED_PIN    2
#define SSID       "Neo6G"
#define PASS       "Passw01d"
#define FW_VERSION "1.1.0"

#define SVC_UUID   "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define C_STATE    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define C_TANK     "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define C_LOGCTRL  "beb54840-36e1-4688-b7f5-ea07361b26a8"
#define C_LOGDATA  "beb54841-36e1-4688-b7f5-ea07361b26a8"
#define C_TIMESYNC "beb54842-36e1-4688-b7f5-ea07361b26a8"
#define C_FWVER        "beb54843-36e1-4688-b7f5-ea07361b26a8"
#define C_RESET_REASON "beb54844-36e1-4688-b7f5-ea07361b26a8"
#define C_FILL_TARGET  "beb54845-36e1-4688-b7f5-ea07361b26a8"

// ── Tunable params ────────────────────────────────────────────────────────────
#define NOTIFY_INTERVAL_MS    2000    // normal BLE state cadence
#define NOTIFY_OTA_INTERVAL   10000   // slow cadence during active WiFi OTA
#define STALL_TIMEOUT_MS      12000   // force re-advertise if no notify sent while "connected"
#define WIFI_CHECK_MS         30000   // WiFi watchdog interval
#define LOG_FRAME_MS          50      // inter-log-frame gap (non-blocking)
#define DRAIN_STEP_PCT        0.3f    // % drained per tick  (90→20 in ~3.7 min)
#define FILL_STEP_PCT         0.8f    // % filled per tick   (20→90 in ~1.4 min)
#define LOW_TANK_PCT          20.0f
#define FULL_TANK_PCT_DEFAULT 90.0f

// ── State ─────────────────────────────────────────────────────────────────────
static NimBLECharacteristic *charState, *charTank, *charLogData;
static NimBLEServer          *bleServer = nullptr;
static NimBLEOta              bleOta;
static Preferences            prefs;
static float                  fullTankPct = FULL_TANK_PCT_DEFAULT;

static volatile bool bleConnected    = false;
static bool          doSendLogs     = false;
static bool          pushStateNow   = false;
static unsigned long pushScheduled  = 0;
static uint32_t      syncedEpoch   = 0;
static unsigned long lastNotify    = 0;
static unsigned long lastActivity  = 0;
static unsigned long lastWifiCheck = 0;
static bool          otaActive     = false;
static bool          fwValidated   = false;  // true after esp_ota_mark_app_valid called

// Simulated sensor values
static float tankPct    = 72.0f;
static int   pumpState  = 0;
static bool  motorOn    = false;
static bool  manualMode = false;

// Non-blocking log stream
static bool          logStreaming  = false;
static int           logFrameIdx  = 0;
static unsigned long logFrameNext = 0;

// ── BLE callbacks ─────────────────────────────────────────────────────────────

class ConnCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*, NimBLEConnInfo& info) override {
    bleConnected   = true;
    pushScheduled  = millis() + 800;  // push 800ms post-connect — covers service discovery + CCCD write
    lastActivity   = millis();
    Serial.printf("BLE: connected — peer=%s\n", info.getAddress().toString().c_str());
  }
  void onDisconnect(NimBLEServer*, NimBLEConnInfo& info, int reason) override {
    bleConnected  = false;
    logStreaming   = false;
    logFrameIdx    = 0;
    lastNotify     = 0;   // reset so watchdog doesn't fire on next connection
    pushScheduled  = 0;   // cancel any pending initial push
    Serial.printf("BLE: disconnected (reason=0x%02X)\n", reason);
    // advertiseOnDisconnect(true) also handles this, but belt-and-suspenders:
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

// ── BLE OTA callbacks ─────────────────────────────────────────────────────────

class OtaCB : public NimBLEOtaCallbacks {
  void onStart(NimBLEOta*, uint32_t size, NimBLEOta::Reason reason) override {
    Serial.printf("BLE-OTA: start size=%u reason=%d\n", size, reason);
    otaActive = true;  // slow down BLE state notifies during transfer
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

  uint32_t t = syncedEpoch > 0 ? syncedEpoch : (millis()/1000);
  char buf[144];

  switch (logFrameIdx) {
    case 0:
      snprintf(buf, sizeof(buf),
        "{\"id\":1,\"t\":%u,\"type\":1,\"tank\":68,\"dur\":120,\"stop\":1}",
        t > 600 ? t-600 : 0);
      charLogData->setValue((uint8_t*)buf, strlen(buf));
      charLogData->notify();
      Serial.printf("Log[0]: %s\n", buf);
      break;
    case 1:
      snprintf(buf, sizeof(buf),
        "{\"id\":2,\"t\":%u,\"type\":2,\"tank\":72,\"dur\":180,\"stop\":1}",
        t > 200 ? t-200 : 0);
      charLogData->setValue((uint8_t*)buf, strlen(buf));
      charLogData->notify();
      Serial.printf("Log[1]: %s\n", buf);
      break;
    case 2:
      charLogData->setValue("DONE");
      charLogData->notify();
      logStreaming = false;
      Serial.println("Log: DONE");
      break;
    default:
      logStreaming = false;
      break;
  }
  logFrameIdx++;
}

// ── Simulation ────────────────────────────────────────────────────────────────

void updateSimulation() {
  if (motorOn) {
    tankPct += FILL_STEP_PCT;
    if (tankPct >= fullTankPct) {
      tankPct   = fullTankPct;
      motorOn   = false;
      pumpState = 0;
      Serial.printf("Sim: FULL %.0f%% — motor OFF\n", tankPct);
    }
  } else {
    tankPct -= DRAIN_STEP_PCT;
    if (tankPct <= LOW_TANK_PCT) {
      tankPct   = LOW_TANK_PCT;
      motorOn   = true;
      pumpState = 3;
      Serial.printf("Sim: LOW %.0f%% — motor ON\n", tankPct);
    }
  }
  tankPct = constrain(tankPct, 0.0f, 100.0f);
}

// ── Notify helpers ────────────────────────────────────────────────────────────

void pushState() {
  if (!bleConnected || !charState || !charTank) return;
  char buf[96];
  snprintf(buf, sizeof(buf),
    "{\"state\":%d,\"motor\":%s,\"manual\":%s,\"tank\":%.1f}",
    pumpState,
    motorOn    ? "true" : "false",
    manualMode ? "true" : "false",
    tankPct);
  charState->setValue((uint8_t*)buf, strlen(buf));
  charState->notify();

  snprintf(buf, sizeof(buf), "%.1f", tankPct);
  charTank->setValue((uint8_t*)buf, strlen(buf));
  charTank->notify();

  lastNotify = millis();
  digitalWrite(LED_PIN, !digitalRead(LED_PIN));

  // Rollback validation: mark firmware valid after first successful notify.
  // If firmware crashes before this call, bootloader auto-reverts to previous OTA slot.
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

// ── setup ─────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  // 8 fast blinks — confirms WaterTank firmware (not stock OTA firmware)
  for (int i = 0; i < 8; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
  }

  // Load user-configurable fill target from NVS (persists across reboots)
  prefs.begin("watertank", false);
  fullTankPct = constrain(prefs.getFloat("fill_pct", FULL_TANK_PCT_DEFAULT), 1.0f, 98.0f);
  Serial.printf("FillTarget: loaded %.0f%% from NVS\n", fullTankPct);

  // WiFi — STA preferred for coexistence; AP fallback keeps OTA alive
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

  // BLE — NimBLE stack
  NimBLEDevice::init("WaterTank");
  NimBLEDevice::setMTU(512);

  bleServer = NimBLEDevice::createServer();
  bleServer->setCallbacks(new ConnCB());
  // Guards against NimBLE 2.x bug #886/#915 where onDisconnect stops firing
  // after repeated unclean disconnects — this makes advertising restart automatic
  // at the stack level independent of the callback.
  bleServer->advertiseOnDisconnect(true);

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

  // C_FWVER: app reads this on connect to check if update is needed
  NimBLECharacteristic* fwVer = svc->createCharacteristic(C_FWVER, NIMBLE_PROPERTY::READ);
  fwVer->setValue(FW_VERSION);

  // C_RESET_REASON: app reads last reset cause for crash diagnostics (zero SRAM cost — register read)
  NimBLECharacteristic* rstReason = svc->createCharacteristic(C_RESET_REASON, NIMBLE_PROPERTY::READ);
  uint8_t rstCode = (uint8_t)esp_reset_reason();
  rstReason->setValue(&rstCode, 1);

  // C_FILL_TARGET: user-configurable motor stop level (1-98%), stored in NVS
  NimBLECharacteristic* fillTarget = svc->createCharacteristic(
    C_FILL_TARGET, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE);
  fillTarget->setCallbacks(new FillTargetCB());
  char ftBuf[8];
  snprintf(ftBuf, sizeof(ftBuf), "%d", (int)fullTankPct);
  fillTarget->setValue(ftBuf);

  svc->start();

  // BLE OTA service (separate GATT service, UUID 0x8018)
  bleOta.start(new OtaCB());
  // Abort any stuck OTA after 5 minutes — prevents hung transfer blocking BLE
  bleOta.startAbortTimer(300);

  // 128-bit UUID + name > 31B adv limit → split across adv + scan response
  NimBLEAdvertisementData scanRsp;
  scanRsp.setName("WaterTank");

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SVC_UUID);
  adv->enableScanResponse(true);
  adv->setScanResponseData(scanRsp);
  adv->start();

  Serial.printf("BLE: advertising v%s. Sim: tank=%.0f%% motor=%s\n",
                FW_VERSION, tankPct, motorOn ? "ON" : "OFF");
}

// ── loop ──────────────────────────────────────────────────────────────────────

void loop() {
  // OTA — call first, every iteration
  wfHandleOTA();

  unsigned long now = millis();

  // Initial state push — 400ms after connect so client has time to write CCCD
  if (pushScheduled > 0 && now >= pushScheduled && bleConnected) {
    pushScheduled = 0;
    updateSimulation();
    pushState();
    lastNotify = now;
  }

  // Non-blocking log stream
  loopLogStream();

  // WiFi watchdog
  if (now - lastWifiCheck >= WIFI_CHECK_MS) {
    lastWifiCheck = now;
    checkWifi();
  }

  // Connection stall watchdog: NimBLE 2.x bug — bleConnected may be stuck true
  // if onDisconnect never fires after an unclean disconnect. If we haven't
  // successfully notified in STALL_TIMEOUT_MS, force re-advertise.
  if (bleConnected && lastNotify > 0 && (now - lastNotify) > STALL_TIMEOUT_MS) {
    Serial.println("Watchdog: stall detected — forcing re-advertise");
    bleConnected = false;
    logStreaming  = false;
    NimBLEDevice::stopAdvertising();
    delay(100);
    NimBLEDevice::startAdvertising();
    lastNotify = now;  // reset so watchdog doesn't immediately re-fire
  }

  // Periodic BLE state notify
  // Use longer interval during OTA to give WiFi more uncontested radio time.
  unsigned long interval = otaActive ? NOTIFY_OTA_INTERVAL : NOTIFY_INTERVAL_MS;
  if (bleConnected && (now - lastNotify) >= interval) {
    updateSimulation();
    pushState();
    Serial.printf("Tick: pumpState=%d motor=%s tank=%.1f%%\n",
                  pumpState, motorOn?"ON":"OFF", tankPct);
  }
}

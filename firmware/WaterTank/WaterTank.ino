// WaterTank BLE firmware — NimBLE-Arduino 2.x for smaller binary (~900KB vs 1.7MB).
// Implements the exact 5-characteristic GATT protocol from constants/ble.ts.
// OTA stays active via wfHandleOTA() in loop().

#include <NimBLEDevice.h>
#include <WiFi.h>
#include <WFStorm.h>

#define LED_PIN    2
#define SSID       "Neo6G"
#define PASS       "Passw01d"

#define SVC_UUID   "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define C_STATE    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define C_TANK     "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define C_LOGCTRL  "beb54840-36e1-4688-b7f5-ea07361b26a8"
#define C_LOGDATA  "beb54841-36e1-4688-b7f5-ea07361b26a8"
#define C_TIMESYNC "beb54842-36e1-4688-b7f5-ea07361b26a8"

static NimBLECharacteristic *charState, *charTank, *charLogData;

static bool          bleConnected  = false;
static bool          doSendLogs    = false;
static uint32_t      syncedEpoch   = 0;
static unsigned long lastNotify    = 0;

// Demo values — replace with real sensor reads later
static float tankPct    = 72.0f;
static int   pumpState  = 0;
static bool  motorOn    = false;
static bool  manualMode = false;

// ── BLE callbacks ─────────────────────────────────────────────────────────

class ConnCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*, NimBLEConnInfo&) override {
    bleConnected = true;
  }
  void onDisconnect(NimBLEServer*, NimBLEConnInfo&, int) override {
    bleConnected = false;
    NimBLEDevice::startAdvertising();
  }
};

class TimeSyncCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    NimBLEAttValue v = c->getValue();
    if (v.size() >= 4) {
      const uint8_t* d = v.data();
      syncedEpoch = (uint32_t)d[0]
                  | ((uint32_t)d[1] << 8)
                  | ((uint32_t)d[2] << 16)
                  | ((uint32_t)d[3] << 24);
    }
  }
};

// Set flag; send in loop() to avoid blocking the BLE task
class LogCtrlCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo&) override {
    NimBLEAttValue v = c->getValue();
    if (v.size() > 0 && v.data()[0] == 0x01) doSendLogs = true;
    // 0x02 = ACK from app — nothing to do on ESP32
  }
};

// ── Log stream ────────────────────────────────────────────────────────────

void sendLogStream() {
  if (!bleConnected || !charLogData) return;
  uint32_t t = syncedEpoch > 0 ? syncedEpoch : (millis() / 1000);
  char buf[128];

  snprintf(buf, sizeof(buf),
    "{\"id\":1,\"t\":%u,\"type\":1,\"tank\":68,\"dur\":120,\"stop\":1}", t - 600);
  charLogData->setValue((uint8_t*)buf, strlen(buf));
  charLogData->notify();
  delay(40);

  snprintf(buf, sizeof(buf),
    "{\"id\":2,\"t\":%u,\"type\":1,\"tank\":72,\"dur\":180,\"stop\":1}", t - 200);
  charLogData->setValue((uint8_t*)buf, strlen(buf));
  charLogData->notify();
  delay(40);

  charLogData->setValue("DONE");
  charLogData->notify();
}

// ── setup ─────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  // 8 fast blinks on boot — confirms new WaterTank firmware
  for (int i = 0; i < 8; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
  }

  // WiFi for OTA (BLE coexists on shared radio)
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi: "); Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH); delay(500); digitalWrite(LED_PIN, LOW);
    wfConfigOTA(SSID, PASS, WF_STATION);
  } else {
    Serial.println("WiFi failed — OTA via AP");
    wfConfigOTA("StormBoard", "esp32ota", WF_AP);
  }

  // BLE — NimBLE stack
  NimBLEDevice::init("WaterTank");
  NimBLEDevice::setMTU(512);

  NimBLEServer* srv = NimBLEDevice::createServer();
  srv->setCallbacks(new ConnCB());

  NimBLEService* svc = srv->createService(SVC_UUID);

  charState = svc->createCharacteristic(C_STATE, NIMBLE_PROPERTY::NOTIFY);
  charTank  = svc->createCharacteristic(C_TANK,  NIMBLE_PROPERTY::NOTIFY);

  NimBLECharacteristic* logCtrl = svc->createCharacteristic(
    C_LOGCTRL, NIMBLE_PROPERTY::WRITE);
  logCtrl->setCallbacks(new LogCtrlCB());

  charLogData = svc->createCharacteristic(C_LOGDATA, NIMBLE_PROPERTY::NOTIFY);

  NimBLECharacteristic* timeSync = svc->createCharacteristic(
    C_TIMESYNC, NIMBLE_PROPERTY::WRITE);
  timeSync->setCallbacks(new TimeSyncCB());

  svc->start();

  // Primary adv: service UUID. Scan response: device name.
  // 128-bit UUID (18B) + name (11B) + flags (3B) = 32B > 31B limit, so split them.
  NimBLEAdvertisementData scanRsp;
  scanRsp.setName("WaterTank");

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SVC_UUID);
  adv->enableScanResponse(true);
  adv->setScanResponseData(scanRsp);
  adv->start();

  Serial.println("BLE advertising as WaterTank");
}

// ── loop ──────────────────────────────────────────────────────────────────

void loop() {
  wfHandleOTA();

  if (doSendLogs) {
    doSendLogs = false;
    sendLogStream();
  }

  if (bleConnected) {
    unsigned long now = millis();
    if (now - lastNotify >= 2000) {
      lastNotify = now;

      char buf[96];
      snprintf(buf, sizeof(buf),
        "{\"state\":%d,\"motor\":%s,\"manual\":%s,\"tank\":%.0f}",
        pumpState,
        motorOn    ? "true" : "false",
        manualMode ? "true" : "false",
        tankPct);
      charState->setValue((uint8_t*)buf, strlen(buf));
      charState->notify();

      snprintf(buf, sizeof(buf), "%.0f", tankPct);
      charTank->setValue((uint8_t*)buf, strlen(buf));
      charTank->notify();

      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
  }
}

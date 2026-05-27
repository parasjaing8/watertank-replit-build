# WaterTank — Security & Pairing Plan
_Created: 2026-05-27 | Status: PLANNING_

## Goal
Tapo-style onboarding and security model. Factory default password, mandatory first-time setup (name + new password), per-device session tokens, BLE visibility control. No cloud required — all local BLE.

---

## Architecture Summary

### ESP32 NVS storage
```
claimed        bool    — false = factory state, true = setup complete
device_name    string  — "WaterTank" (default) / user-set
password_hash  bytes   — SHA256 of password; SHA256("1234") at factory flash
sessions[]     bytes   — up to 5 × 16-byte tokens, one per paired phone
ble_visible    bool    — controls advertising on/off
```

### New BLE Characteristics (same service UUID, new char UUIDs)
```
C_AUTH         WRITE + READ  — write password or session token; read OK/FAIL/SETUP_REQUIRED
C_SESSION      READ          — 16-byte token issued after successful auth
C_SETUP        WRITE         — JSON {name, password} — only accepted when not yet claimed OR by owner token
C_VISIBILITY   WRITE         — owner writes 1 (on, 5-min window) or 0 (off)
C_CLAIMED      READ          — 0 = factory, 1 = claimed
```

### Security layers
- BLE channel encryption: `NimBLEDevice::setSecurityAuth(BLE_SM_PAIR_AUTHREQ_ENC)` — link encrypted before any characteristic read/write
- Password: SHA256 hashed on ESP32; never stored or transmitted in plaintext
- Auth: session token per paired device — independent revocation without password change
- Visibility: BLE advertising off by default after claiming; time-limited (5 min) when owner enables

### Pairing flows

**Factory / first pairing**
```
Scan → see "WaterTank" → connect → read C_CLAIMED=0
→ prompt "Enter setup password" → user types "1234"
→ write to C_AUTH → ESP32 validates SHA256 → responds OK
→ read C_SESSION → app stores token
→ mandatory setup screen: [Device Name] [New Password]
→ write to C_SETUP → ESP32 saves NVS, sets claimed=1, restarts adv as new name
→ ESP32 stops advertising after 30s
```

**Returning owner phone**
```
App has stored {deviceMac, token}
→ connect directly by MAC (no scan needed)
→ write token to C_AUTH → ESP32 validates → OK
→ no password prompt — seamless
```

**Adding second user (e.g. mother's phone)**
```
Owner app: Settings → "Allow new pairing" → writes 1 to C_VISIBILITY
→ ESP32 advertises for 5 min
→ Second phone scans → sees "Home Tank" → connects
→ reads C_CLAIMED=1 → prompt "Enter password"
→ enters owner-set password → writes to C_AUTH → OK
→ reads C_SESSION → gets unique token B (stored on mother's phone)
→ ESP32 now has 2 active session tokens
```

**Factory reset**
```
Hardware: hold button 10s → NVS clear → reboot to factory state
Software: Settings → Reset → requires owner token auth → clears NVS
```

---

## Phases

---

### PHASE 1 — Firmware: NVS + Auth Characteristics
**Files:** `firmware/WaterTank/WaterTank.ino`
**Goal:** ESP32 stores password hash + sessions, exposes C_AUTH / C_SESSION / C_CLAIMED / C_SETUP / C_VISIBILITY characteristics. No app changes yet — validate with nRF Connect manually.

Tasks:
- [ ] F1.1 — Add `#include <nvs_flash.h>` and NVS helpers: `nvsGetStr`, `nvsSetStr`, `nvsGetBool`, `nvsSetBool`
- [ ] F1.2 — On boot: load `claimed`, `device_name`, `password_hash`, `sessions[]` from NVS. If not found, write factory defaults (name="WaterTank", password_hash=SHA256("1234"), claimed=false)
- [ ] F1.3 — Implement SHA256 helper (mbedTLS is available on ESP32: `mbedtls_md`)
- [ ] F1.4 — Add 5 new characteristic UUIDs (define in firmware header alongside existing ones)
- [ ] F1.5 — Implement `C_CLAIMED` read handler — returns 0 or 1
- [ ] F1.6 — Implement `C_AUTH` write handler:
  - If input is 16 bytes → treat as session token, validate against `sessions[]`
  - If input is string → SHA256 it, compare to `password_hash`
  - On success: generate 16-byte random token, store in `sessions[]` (evict oldest if full), write to `C_SESSION`
  - Response: write "OK", "FAIL", or "SETUP_REQUIRED" to C_AUTH read value
- [ ] F1.7 — Implement `C_SETUP` write handler:
  - Parse JSON `{name, password}`
  - Validate: requires valid auth session (track `authedSession` flag per connection)
  - Save `device_name` and `SHA256(password)` to NVS
  - Set `claimed=true` in NVS
  - Restart BLE advertising with new name
- [ ] F1.8 — Implement `C_VISIBILITY` write handler:
  - `1` → `NimBLEDevice::startAdvertising()`, start 5-min countdown timer, then `stopAdvertising()`
  - `0` → `NimBLEDevice::stopAdvertising()` immediately
  - Only accepted from authed session
- [ ] F1.9 — Add BLE channel encryption: `NimBLEDevice::setSecurityAuth(BLE_SM_PAIR_AUTHREQ_ENC)` + `BLE_HS_IO_NO_INPUT_OUTPUT`
- [ ] F1.10 — Update `advertiseOnDisconnect` logic: after claiming, only re-advertise if `ble_visible=true`
- [ ] F1.11 — Hardware factory reset: detect 10s button hold in `loop()`, clear NVS namespace, restart
- [ ] F1.12 — Password change (via C_SETUP on claimed device): clear all existing `sessions[]` before saving new password hash — forces all paired devices to re-auth

---

### PHASE 2 — App: New BLE Constants + Auth Service Layer
**Files:** `constants/ble.ts`, new `services/AuthService.ts`, `services/BLEService.ts`
**Goal:** App-side auth logic in isolation — no UI yet. BLEService gains auth handshake before accessing existing characteristics.

Tasks:
- [ ] A2.1 — Add new characteristic UUIDs to `constants/ble.ts` (C_AUTH, C_SESSION, C_SETUP, C_VISIBILITY, C_CLAIMED)
- [ ] A2.2 — Create `services/AuthService.ts`:
  - `storeSession(deviceMac: string, token: string, deviceName: string): Promise<void>` — AsyncStorage
  - `getSession(deviceMac: string): Promise<{token, deviceName} | null>`
  - `clearSession(deviceMac: string): Promise<void>`
  - `listSessions(): Promise<StoredDevice[]>`
- [ ] A2.3 — Update `BLEService.connectToDevice()`: after `discoverAllServicesAndCharacteristics`, run auth handshake BEFORE reading firmware version or setting up monitors:
  - Read `C_CLAIMED`
  - If claimed=1: read stored token from AuthService, write to `C_AUTH`, read response
  - If claimed=0: set `needsFirstTimeSetup=true` flag on service, emit to listener
  - If auth FAIL: disconnect, emit auth error state
- [ ] A2.4 — Add `authState: 'pending' | 'ok' | 'fail' | 'setup_required'` to `DeviceState` model
- [ ] A2.5 — Add `submitPassword(password: string): Promise<'ok'|'fail'|'setup_required'>` method to BLEService
- [ ] A2.6 — Add `submitSetup(name: string, password: string): Promise<void>` method to BLEService
- [ ] A2.7 — Add `setVisibility(on: boolean): Promise<void>` method to BLEService
- [ ] A2.8 — Update direct-connect: after first pairing, BLEService stores MAC. On scan, if stored MAC found — skip `isTankDevice` check, attempt that device directly.

---

### PHASE 3 — App: Pairing UI Screens
**Files:** new `components/PairingSheet.tsx`, new `components/DeviceSetupModal.tsx`, `app/(tabs)/index.tsx`, `context/DeviceContext.tsx`
**Goal:** User-facing flows for first pairing, returning connection, and adding second device.

Tasks:
- [ ] U3.1 — `PairingSheet.tsx`: bottom sheet shown when `authState='fail'` or `authState='setup_required'` with claimed=0
  - Password input field (masked)
  - "Connect" button → calls `submitPassword()`
  - Error state on FAIL
- [ ] U3.2 — `DeviceSetupModal.tsx`: full-screen modal shown after first successful password auth on unclaimed device
  - Device name input (pre-filled "WaterTank")
  - New password input + confirm
  - Mandatory — cannot dismiss
  - On confirm → calls `submitSetup()`
- [ ] U3.3 — Dashboard: show auth gate — if `authState !== 'ok'`, show PairingSheet instead of tank UI
- [ ] U3.4 — Settings screen: add "Paired Devices" section
  - List stored sessions (device name + last connected)
  - "Allow new pairing" button → calls `setVisibility(true)`, shows "Pairing window open for 5 min" banner
  - "Remove this device" (factory reset flow)
- [ ] U3.5 — i18n keys for all new strings (en/hi/mr/kn)

---

### PHASE 4 — End-to-End Validation (Programmatic)
**Files:** `scripts/auth_test.py` (new), extend `scripts/ble_test.py`
**Goal:** Automated BLE test suite covering all auth flows. Run against real hardware.

Tests to write:
- [ ] T4.1 — `AUTH_01`: Connect to unclaimed board → read C_CLAIMED=0
- [ ] T4.2 — `AUTH_02`: Write wrong password → read C_AUTH=FAIL
- [ ] T4.3 — `AUTH_03`: Write default password "1234" → read C_AUTH=OK → read C_SESSION returns 16 bytes
- [ ] T4.4 — `AUTH_04`: Write valid session token → read C_AUTH=OK (token reuse works)
- [ ] T4.5 — `AUTH_05`: Write invalid token → read C_AUTH=FAIL
- [ ] T4.6 — `SETUP_01`: Write C_SETUP without prior auth → rejected (no response / FAIL)
- [ ] T4.7 — `SETUP_02`: Auth with default password → write C_SETUP `{name:"TestTank", password:"newpass"}` → C_CLAIMED becomes 1
- [ ] T4.8 — `SETUP_03`: After SETUP_02, old default password "1234" → C_AUTH=FAIL
- [ ] T4.9 — `SETUP_04`: After SETUP_02, new password "newpass" → C_AUTH=OK
- [ ] T4.10 — `VIS_01`: Write C_VISIBILITY=0 without auth → rejected
- [ ] T4.11 — `VIS_02`: Auth → write C_VISIBILITY=1 → confirm advertising visible to scanner
- [ ] T4.12 — `VIS_03`: Write C_VISIBILITY=0 → confirm advertising stopped
- [ ] T4.13 — `TOKEN_01`: Simulate 5 paired devices (fill session slots) → 6th auth creates new token, oldest evicted
- [ ] T4.14 — `RESET_01`: NVS reset via factory reset command → C_CLAIMED=0, default password works again
- [ ] T4.15 — `EXISTING_01`: Regression — existing STATE notify / TANK notify / LOG_CTRL / FILL_TARGET all work after auth

---

### PHASE 5 — Release Build + Manual Smoke Test
**Goal:** Clean APK build, install on test phone, walk full user journey end to end.

Tasks:
- [ ] R5.1 — Flash firmware to board (OTA via WiFi)
- [ ] R5.2 — `expo prebuild --clean --platform android` (new characteristics may need no native change — verify)
- [ ] R5.3 — `cd android && ./gradlew assembleRelease`
- [ ] R5.4 — Manual smoke test checklist:
  - [ ] Fresh install → scan → see "WaterTank" → enter "1234" → setup modal appears
  - [ ] Set name "Home Tank" + password → confirm → dashboard loads
  - [ ] Kill app → reopen → connects directly (no password prompt)
  - [ ] Settings → Allow new pairing → second phone scans → sees "Home Tank" → enters password → gets in
  - [ ] First phone: revoke second device token → second phone gets FAIL on next connect
  - [ ] Hardware button 10s → factory reset → scan shows "WaterTank" again
  - [ ] Existing features: tank level, motor status, records screen, simulation mode — all unaffected
- [ ] R5.5 — Tag release, push APK to GitHub Releases as v32+

---

## Characteristic UUIDs (to be assigned in F1.4)
```
C_AUTH        beb54846-36e1-4688-b7f5-ea07361b26a8
C_SESSION     beb54847-36e1-4688-b7f5-ea07361b26a8
C_SETUP       beb54848-36e1-4688-b7f5-ea07361b26a8
C_VISIBILITY  beb54849-36e1-4688-b7f5-ea07361b26a8
C_CLAIMED     beb5484a-36e1-4688-b7f5-ea07361b26a8
```
_(sequential from last used: `beb54845` = C_FILL_TARGET)_

---

## Decisions

**Q1 — Session token expiry: No time-based expiry. Permanent until:**
1. Password change → all tokens invalidated (everyone must re-auth). Covers stolen phone.
2. Settings → "Remove all paired devices" → clears token list, keeps current password.
3. Hardware factory reset → full NVS wipe.
Rationale: home appliance UX — users don't expect periodic re-auth. Threat model (stolen phone) is covered by password change.

**Q2 — Multi-user permissions: Full access for all paired users.** No admin/guest distinction. Keeps app simple.

**Q3 — Default password: Hardcoded "1234" in firmware for all boards.** Not per-unit.

---

## Status Tracker

| Phase | Status | Notes |
|---|---|---|
| PHASE 1 — Firmware auth | NOT STARTED | |
| PHASE 2 — App auth service | NOT STARTED | |
| PHASE 3 — Pairing UI | NOT STARTED | |
| PHASE 4 — Test suite | NOT STARTED | |
| PHASE 5 — Release build | NOT STARTED | |

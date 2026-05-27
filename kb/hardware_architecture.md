# WaterTank — Hardware Architecture

_Last updated: 2026-05-27_

---

## System Overview

Municipality / Gram Panchayat water motor controller.
Water arrives at random times via municipal connection.
Motor pumps municipal water into overhead tank.
Completely automated, with a parallel manual fallback that is electronically independent.

---

## Motor Stop Conditions (whichever comes first)

1. Tank reaches user-defined fill % (default 90%, configurable 1–98% via app)
2. Municipal water supply cuts off (inlet sensor detects no water)

Motor start condition: water detected at motor inlet (inlet sensor HIGH).

---

## Components

| Component | Spec | Purpose |
|---|---|---|
| Witty Fox Storm Board (ESP32) | — | Main controller |
| AC Contactor | 25A (e.g. Schneider LC1-D09) | Switches motor power — rated for motor inductive loads |
| ESP32 relay module | 5V, 10A | Controls contactor coil only (NOT motor directly) |
| Optocoupler module | PC817 | Feeds contactor aux contact state to ESP32 GPIO — galvanic isolation |
| Manual toggle switch | SPST, 10A | User's original manual control — purely electrical, zero electronics |
| Float switch (inlet) | NC/NO | Detects municipal water presence at motor inlet |
| JSN-SR04T | Ultrasonic | Tank level measurement (F-SENSOR, not yet wired) |
| MCB | 16A | Overcurrent protection in series with motor |

---

## Wiring

### Power path (motor switching)

```
230V Live ── MCB 16A ── Contactor MAIN contacts (NO) ── Motor ── 230V Neutral
```

The contactor's main contacts are the only thing that switch motor power.
No relay, no ESP32 circuitry is in this path.

### Contactor coil control (two independent parallel paths)

```
230V Live ──┬── Manual Switch (SW_MANUAL) ──┬── Contactor Coil A1
            │                                │
            └── ESP32 Relay (NO contact) ────┘
                                                 Contactor Coil A2 ── 230V Neutral
```

**Key design decision:** SW_MANUAL is wired directly to the contactor coil — no ESP32,
no optocoupler, no electronics in this path. If the ESP32 is dead, unplugged, or
malfunctioning, SW_MANUAL works exactly as the user's original manual switch always did.
This is the fallback — completely free of any intervention.

Either path independently energises the contactor coil. Motor runs if either is closed.

### Feedback path (ESP32 sensing only — read only, never controls)

```
Contactor AUX contact (NO) ── 230V signal ── Optocoupler IN
                                              Optocoupler OUT ── ESP32 GPIO_AUX (INPUT_PULLDOWN)
```

Optocoupler provides galvanic isolation — 230V never touches the ESP32.
This is how the board knows the actual motor state regardless of who started it.

### Sensor paths

```
Inlet float switch ── ESP32 GPIO_INLET (INPUT_PULLUP, active LOW when water present)
JSN-SR04T TRIG ────── ESP32 GPIO_TRIG
JSN-SR04T ECHO ────── ESP32 GPIO_ECHO
```

---

## Manual Override Behaviour

| Scenario | What happens |
|---|---|
| User closes SW_MANUAL (ESP32 relay open) | Contactor energises via manual path. Aux contact closes → GPIO_AUX HIGH. ESP32 sees motor ON but didn't command it → logs MANUAL_ON. Does NOT interfere. |
| User opens SW_MANUAL mid-fill | Contactor de-energises. GPIO_AUX goes LOW. ESP32 sees motor OFF unexpectedly → logs MANUAL_OFF. ESP32 de-energises its own relay to stay consistent. |
| User uses extra water after tank full | Tank hit target, ESP32 opened relay. User closes SW_MANUAL for extra use. ESP32 detects MANUAL_ON, logs it, stays out of the way. |
| ESP32 dead / unplugged | SW_MANUAL controls contactor directly — exactly as original manual wiring. No logging (board is off). Acceptable fallback. |

---

## Firmware Logic (to implement in F-SENSOR milestone)

```
GPIO_INLET  → INPUT_PULLUP  — LOW = water present at inlet
GPIO_AUX    → INPUT_PULLDOWN — HIGH = contactor closed (motor actually running)
GPIO_RELAY  → OUTPUT         — HIGH = ESP32 energises contactor coil

Every loop tick:
  aux   = digitalRead(GPIO_AUX)
  inlet = digitalRead(GPIO_INLET)

  // Detect manual override
  if aux == HIGH and relay_commanded == OFF:
      log MANUAL_ON, set manualMode = true

  if aux == LOW and relay_commanded == ON:
      log MANUAL_OFF, set manualMode = false
      de-energise relay (stay consistent)

  // Automation (only when not in manual mode)
  if not manualMode:
      if inlet == LOW (water present) and aux == LOW (motor off) and tank < fillTarget:
          energise relay → motor starts → log MOTOR_ON

      if aux == HIGH (motor running):
          if inlet == HIGH (supply cut):
              de-energise relay → log MOTOR_OFF, stopReason = SUPPLY_CUT
          if tank >= fillTarget:
              de-energise relay → log MOTOR_OFF, stopReason = TANK_FULL

  // Exit manual mode when user turns off SW_MANUAL
  if manualMode and aux == LOW:
      manualMode = false
```

---

## Safety Notes

- Contactor is mandatory — small relay contacts arc and weld shut under motor inductive load.
- Optocoupler is mandatory — never connect 230V aux contact directly to ESP32 GPIO.
- MCB protects against overcurrent / short circuit on motor side.
- No series interlock — ESP32 cannot force-cut motor when user is in manual mode.
  This is intentional: manual control is sovereign.

---

## Milestones

| ID | Description | Status |
|---|---|---|
| F-OTA | BLE firmware update | Done |
| F-SENSOR | Wire JSN-SR04T, GPIO_INLET float switch, GPIO_AUX optocoupler; implement real sensor logic | Pending |
| F-PROD | Remove WiFi (battery power, BLE-only) | Pending |

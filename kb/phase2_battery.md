# Phase 2 — Battery Backup System
_Status: Deferred. Phase 1 ships without battery. This doc captures all research for Phase 2 implementation._

---

## Project Context

- **Product**: Smart Water Tank Automation Controller
- **MCU**: ESP32 (BLE-only, no WiFi)
- **Power Input**: 5V 2A USB-C adapter
- **Phase 1 decision**: Ship without battery backup — USB-C powered only
- **Phase 2 goal**: Add seamless battery backup with no changes to firmware or ESP32 behaviour

---

## Core Requirement (Phase 2)

Single-point solution that:
1. Takes 5V USB-C input
2. Charges the battery (CC/CV, auto-cutoff at full charge)
3. Simultaneously powers ESP32 from input (not battery) when power is present
4. On input power loss → instantly switches ESP32 to battery, no glitch, no brownout, no reboot
5. On input power restore → instantly switches back to USB, resumes charging
6. All of the above in one IC or one module — no hacks, no diode ORing, no manual switching
7. Proven in community ESP32 projects, documented, findable online

---

## Why Battery Backup Makes Sense for This Project

- BLE-only architecture → ESP32 average current draw is very low (~30–80mA)
- Low current = long battery runtime on a single 18650 (~40–50 hours)
- Low current = smaller, cheaper UPS architecture viable
- Benefits: state retention during outage, auto-resume after power restore, reduced reboot issues, better reliability in field

---

## What Battery Backup Should NOT Cover

- **Water pump motor** — requires inverter-level architecture, completely different cost and complexity
- Battery backup covers: ESP32, sensors, BLE communication, controller logic ONLY

---

## Solutions Evaluated

### ❌ TP4056 (rejected)
- Simple charger IC only — charges battery, does NOT manage load
- No PowerPath — separate diode ORing needed
- Switchover is not glitch-free — brownout risk on ESP32
- Cheap (₹20–40) but incomplete for this requirement

### ❌ IP5306 (rejected — hard disqualifier)
- Used in LilyGo T-Energy S3, many "power bank" style boards
- Has auto-shutdown: cuts output after ~30s if load current < ~75–100mA
- ESP32 in BLE idle mode draws ~30–50mA → triggers auto-shutdown → ESP32 reboots
- This is a hard, documented failure mode for BLE-only ESP32 projects
- **Do not use** for this application regardless of price

### ❌ MH-CD42 UPS Module (not recommended for product)
- Better than TP4056, has boost output
- Efficiency issue: 3.7V battery → 5V boost → 3.3V LDO = double conversion loss
- Not true PowerPath — switchover not glitch-free
- Acceptable for experiments, not for final product

### ❌ LilyGo T-Energy S3 (rejected)
- ESP32-S3 + 18650 holder + USB-C all-in-one board
- Uses IP5306 → same auto-shutdown problem as above
- Dev board form factor — bulky for product enclosure
- Paying for 8MB PSRAM + 16MB Flash that this project doesn't need
- Price: ~₹800–1200 — overpriced for what it offers here

### ❌ Adafruit Feather ESP32 boards (acceptable for prototype, not for product)
- Uses MCP73831 charger + Schottky load-sharing diode
- Not true PowerPath — switchover not instantaneous
- Onboard capacitor absorbs the glitch — practically works but not engineered for it
- JST connector only — needs LiPo pouch cell, not 18650
- Good for firmware prototyping only

---

## ✅ Final Recommendation — Texas Instruments BQ24074

### Why This IC

- Designed specifically for this exact use case: USB input + battery charge + load power simultaneously
- True **PowerPath Management** — not a workaround
  - USB present: powers load from USB, charges battery simultaneously
  - USB removed: instantly switches load to battery — no glitch, no brownout, no ESP32 reboot
  - USB restored: instantly switches back, resumes charging
- Used by Adafruit across their entire Feather line — millions of boards, years of community validation
- SparkFun LiPo Charger Plus uses BQ24079 (same TI family)
- Thousands of ESP32 + BQ24074 project references on GitHub, Hackaday, Arduino forums
- Full TI datasheet with reference designs for exactly the USB → ESP32 + LiPo topology

### Specific Part

**BQ24074RGTT** — available at [robu.in](https://robu.in/product/bq24074rgtt-texas-instruments-battery-charger-1-cell-li-ion-battery-10-2-v-input-4-2-v-1-5-a-charge-qfn-16/)

| Parameter | Value | Notes |
|---|---|---|
| Cell count | 1 cell | Single 18650 or LiPo |
| Max input voltage | 10.2V | 5V USB-C — well within spec |
| Charge voltage | 4.2V | Standard Li-Ion termination |
| Max charge current | 1.5A | Set by external resistor — use 500mA–1A for 18650 |
| Output | Battery voltage (~3.7–4.2V) | Needs 3.3V LDO downstream for ESP32 |
| Package | QFN-16 (4mm × 4mm) | SMD only — requires PCB |
| PowerPath | Yes — built in | Core feature |
| Price (robu.in) | ~₹80–150 | Bare IC |

### Package Constraint
- QFN-16 = quad flat no-lead, pads on underside of IC
- **Cannot be breadboarded or hand-soldered with basic iron**
- Requires: PCB design + hot air / reflow soldering OR JLCPCB SMT assembly
- For prototyping: use Adafruit BQ24074 breakout board (same IC, already assembled)

---

## External Components Required (around BQ24074)

| Component | Value | Purpose | Cost |
|---|---|---|---|
| R_ISET resistor | ~2kΩ for 500mA charge | Sets charge current | ₹2 |
| R_ILIM resistor | ~3.4kΩ for 1A input limit | Sets input current limit | ₹2 |
| C_IN capacitor | 10µF ceramic | Input decoupling | ₹5 |
| C_OUT capacitor | 10µF ceramic | Output decoupling | ₹5 |
| C_STAB capacitor | 470µF–1000µF electrolytic | Near ESP32 VCC — absorbs switchover transients | ₹10 |
| AMS1117-3.3 or LP2985 | 3.3V LDO | BQ24074 output is battery voltage (~3.7–4.2V), ESP32 needs 3.3V | ₹10 |
| LED + 1kΩ resistor | Any color | Charge status indicator (optional) | ₹5 |

**Total BOM cost (IC + externals): ~₹150–200**

---

## Battery

### Recommended: Single 18650 Li-Ion Cell

| Brand | Notes |
|---|---|
| Samsung 25R / 30Q | Proven, genuine cells widely available |
| LG MJ1 / HG2 | Good option |
| Panasonic NCR18650B | High capacity |
| **Avoid** | Ultrafire, any unbranded "9800mAh" cells — fake capacity, unsafe |

- Typical genuine 18650 capacity: 2500–3500mAh
- ESP32 BLE average current: ~50mA
- Runtime estimate: **50–70 hours** on one cell
- Cost: ₹180–250 for genuine cell

---

## Phase 2 Bill of Materials (Complete)

| Component | Part | Source | Approx Cost |
|---|---|---|---|
| PowerPath IC | BQ24074RGTT | robu.in / LCSC | ₹100 |
| Battery | Samsung 25R 18650 | Local electronics market | ₹200 |
| 18650 holder | Single cell with leads | Robu / Amazon | ₹30 |
| LDO 3.3V | AMS1117-3.3 SOT-223 | Any supplier | ₹10 |
| Capacitors | 10µF ×2, 1000µF ×1 | Any supplier | ₹20 |
| Resistors | 2kΩ, 3.4kΩ | Any supplier | ₹5 |
| LED + resistor | Any | Any supplier | ₹5 |
| USB-C connector | USB-C receptacle breakout | Robu / AliExpress | ₹30 |
| **Total** | | | **~₹400** |

---

## PCB Design Plan (Phase 2)

1. **Tool**: EasyEDA (free, BQ24074 in component library)
2. **Topology**: USB-C → BQ24074 → 18650 + AMS1117-3.3 → ESP32 3.3V rail
3. **Manufacture**: JLCPCB
   - Order bare PCB + SMT assembly for BQ24074 (they stock it)
   - Hand-solder through-hole components (capacitors, LED, holder)
   - Cost: ~₹400–600 for 5 assembled boards
4. **Form factor**: Design to fit existing product enclosure dimensions

---

## Prototype Path (Before PCB)

If validating before committing to PCB:
- Buy **Adafruit BQ24074 breakout board** (~$7 + shipping)
- Wire to existing ESP32 dev board
- Validate: charge behaviour, switchover, BLE uptime during simulated outage
- Once validated → move to custom PCB with BQ24074RGTT

---

## Firmware Changes Needed for Phase 2

- **Battery voltage monitoring**: ESP32 GPIO34 (ADC) → voltage divider from battery terminal
  - Read raw ADC → map to battery % → include in BLE characteristic
  - Already has space in `DeviceState` to add `batteryPct: number`
- **BLE notification on low battery**: Add threshold check (e.g., < 20%) → notify user
- **App changes**: Dashboard badge showing battery % when on backup power
  - Detect "on battery" by comparing input voltage vs battery voltage (or simple GPIO signal from BQ24074's `PG` pin — Power Good output)

---

## Key Engineering Insight

This is not "ESP32 with a battery." It is an embedded power management system. Power architecture directly impacts:
- Brownout behaviour
- Reboot stability in field
- Customer trust
- Data integrity (events not lost mid-write)

BQ24074 handles this correctly by design. Workarounds (diode ORing, IP5306, TP4056) introduce failure modes that appear only in field conditions.

---

## Decision Log

| Decision | Chosen | Reason |
|---|---|---|
| Power input | USB-C 5V 2A | Modern, safe, easy to replace |
| Phase 1 battery | None | Simplicity, cost, time to market |
| Phase 2 IC | BQ24074RGTT | Only proven single-IC PowerPath solution at this budget |
| Battery cell | 18650 Li-Ion | High capacity, replaceable, widely available |
| Pump backup | Never | Inverter-level complexity, out of scope |

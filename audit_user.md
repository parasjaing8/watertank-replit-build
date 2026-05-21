# WaterTank App — User Experience Audit

> Auditor perspective: non-technical village home user, 40–60 years old, casual Android user, wants to know if the water pump is running and how full the tank is.

---

## First Impression

A village user opens the app for the first time and sees the **Dashboard** tab with the header "WaterTank". There is **no onboarding, no welcome screen, no explanation of what the app does**, and no instructions for what to do next.

What they actually see:
- A small blinking grey dot with the text **"Searching..."** at the top
- A vertical empty bar with a dash "—" inside it and the text **"No signal"** underneath
- A box that says **"Waiting for WaterTank device"** with subtext **"Go to Settings → Run Demo to test without hardware"**
- Five tabs at the bottom: Dashboard, Today, History, Stats, Settings

There is **no explanation of what a "WaterTank device" is**, no picture, no diagram of the tank, no "What does this app do?" intro. A 50-year-old village user who installs this with no prior context will not understand that this app controls a water pump, that it needs a physical ESP32 box installed on their pump, or that BLE pairing happens automatically.

The empty vertical bar with a dash inside it is visually meaningless — there is no label "Tank Level" next to it. Someone seeing it for the first time may not realise it represents the water tank at all.

---

## Screen-by-Screen Review

### Dashboard tab (header reads "WaterTank")

**What the user sees (connected, motor running):**
- Top: green dot + "Connected" + "synced 2m ago"
- Big vertical bar filled with colour (green / orange / red) with percentage like "62.5%" both inside the bar and as a big number below
- A card: green dot + "Motor: RUNNING" (and "Air Purge: 32s remaining" during startup delay)
- A card: "Pump State" → "Pumping" (or "Idle", "Supply Detected", "Air Purge (45s)")

**What the user sees (disconnected, no device, fresh install):**
- Grey blinking dot + "Searching..."
- Empty bar with "—" and "No signal"
- "Waiting for WaterTank device" / "Go to Settings → Run Demo to test without hardware"

**What works well:**
- The big tank bar is the dominant element. Colour changes (green → orange → red as it fills) are intuitive.
- Big 36px bold percentage number is readable.
- Motor running indicator is a clear coloured dot + word.

**What is confusing or unclear:**
- **"Pump State" card duplicates info**. The user already sees "Motor: RUNNING" and a tank level. Adding a separate "Pump State: Pumping" card is redundant and confusing — they'll wonder how "Motor" and "Pump" differ.
- **"Air Purge: 32s remaining"** — no village user knows what air purge is. They will think something is broken.
- The pump state value **"Air Purge (45s)"** is shown verbatim — both the "Pump State" card AND the motor card show air purge info, doubling the confusion.
- Red tank colour at 95%+ is **counter-intuitive** — full tank is *good*, not dangerous. Red signals problem; green or blue should mean "tank full".
- "Supply Detected" as a state name is jargon — "water arrived at the pipe" is what they understand.
- **No label on the tank bar**. Just a coloured bar with a number. No text like "Tank Level" or "How full".
- **"Demo completed"** banner says: *"One pump cycle simulated. Connect real hardware or run demo again from Settings."* — "pump cycle" and "real hardware" are developer language.
- **"⚠ MANUAL OVERRIDE ACTIVE"** banner in red — a real user will panic. They don't know what manual override is or what they should do about it.

**Missing info the user would expect:**
- "How much water is in the tank in litres?" — only % is shown
- "When did water last arrive?" — no info
- "Is there water in the pipe right now?" — flow sensor data exists in the model (`flowLpm`) but is invisible on dashboard
- "When will the motor stop?" / "How long until tank is full?" — no estimate
- "Has my pump been running too long today?" — no daily indicator on dashboard
- A simple "Everything is working normally" / "Something needs attention" summary

---

### Today tab

**What the user sees:**
- Header: "Thursday, 21 May 2026" + "5 events"
- List of EventRow items, each showing: time (e.g., "06:43:12"), label ("Motor Started", "Supply Arrived"), tank % (e.g., "62.5%"), and for stops also a chip ("Tank Full" / "Supply Cut") + duration ("1h 23m")
- Pull-to-refresh
- Empty state: "No events today" / *"Waiting for water supply. The motor will start automatically when supply arrives."*

**What works well:**
- Empty state message is genuinely friendly and reassuring — best copy in the whole app.
- Colour-coded left borders give a quick scan signal.

**What is confusing or unclear:**
- Time stamps show **seconds** (`06:43:12`) — for a village user, seconds are noise. `06:43 AM` would be cleaner.
- 24-hour format (`18:30:00`) instead of `6:30 PM` — Indian village users almost universally read time in 12-hour format with AM/PM.
- The event label **"Tank Full — Skipped"** (`EventType.ALREADY_FULL`) is confusing. Skipped what? It means "supply came but tank was already full so we didn't start the motor" — should be plain English.
- **"Synced to Phone"** event in the log is technical and meaningless to a user. Why would they care that data was synced? This should probably be hidden by default.
- **"Manual Override ON" / "Manual Override OFF"** — what is manual override? Unclear from any screen.
- Showing **`62.5%`** on every event row with one decimal — 63% is plenty of precision. Decimals make it feel like scientific data.

**Missing info:**
- No daily summary at the top ("Motor ran 1h 23m today, 2 times")
- No "total water received today" estimate

---

### History tab

**What the user sees:**
- Header with `<` and `>` chevrons and current date in the middle
- Forward chevron is disabled at today (greyed out)
- Same event list as Today
- Empty state: "No events this day" / "No events were recorded on this day."

**What works well:**
- Arrow navigation is simple and discoverable.
- Disabled forward chevron when at today is good UX.

**What is confusing or unclear:**
- **No way to jump to a specific date**. Tapping back through 60 days one at a time is painful.
- No calendar picker, no month/year jump.
- No indicator of "how far back data exists" — user paging back will eventually hit empty days and not know if data is just missing or doesn't exist.
- Empty state is useless: *"No events were recorded on this day."* doesn't help the user understand whether this is normal (water didn't arrive that day) or a problem (device was offline).

---

### Stats tab

**What the user sees:**
- A 3-column table: Date | Duration | Runs
- Rows like: "20 May" / "Wed" | "1h 23m" | "2 runs"
- Empty state: *"No motor runs yet. Motor runtime will appear here once the pump has run at least once. Use Settings → Run Demo to see sample data."*

**What works well:**
- Compact, scannable table.
- Distinct columns with clear units.

**What is confusing or unclear:**
- Empty state references **"Settings → Run Demo"** — telling a real village user about demo mode is wrong; they have real hardware.
- **No graph, no trend, no chart**. For a tab named "Stats", a bar chart of daily motor runtime would be far more useful than a number table.
- **No totals at top** ("This week: 5h 12m, 8 runs"). User has to mentally add rows.
- **No "water received" estimate** — flow sensor data is captured (`flowLpm`) but never shown to the user anywhere.
- The dash "—" for days with no runs is ambiguous: device offline that day? No supply that day? No data?
- "Runs" is jargon for "the number of times the motor turned on". A user thinks of it as "how many times water came".

---

### Settings tab

**Sections: NOTIFICATIONS, DATA, DEBUG, ABOUT.**

**What works well:**
- Standard list of toggles for notifications, clear labels for "Motor started", "Motor stopped".
- Retention chips (30d / 60d / 90d) are touchable and clear.
- Destructive action ("Clear all data") is properly confirmed via Alert.

**What is seriously wrong for a village user:**
- **A whole section literally called "DEBUG"** is exposed in the production app. A non-technical user will tap it, get confused, and possibly break things.
- **"Run demo cycle"** with a play icon is in the user-facing app. A user will tap it expecting their motor to run, see fake data appear, then be very confused about whether their tank is really at 95%.
- **"Show BLE log"** is exposed to end users. BLE log lines like `"GATT connect timeout"` or `"Service 0xFFE0 discovered"` will be terrifying.
- **"BLE requires a native Android build with react-native-ble-plx. This app will stay idle until real hardware connects."** — this entire string is developer talk, leaks the tech stack, and is shown to users on standard Expo Go builds.
- **"Manual override"** toggle in notifications — user has no concept of what this is.
- **"Retention period"** label is jargon. Should be "How long to keep history".
- **"Events stored"** and **"Oldest event"** are diagnostic info dressed up as settings.
- **"Export data (CSV)"** — a village user won't know what CSV is. "Share my pump history" would land better.
- **"Sync now"** doesn't explain what sync does or when you'd use it. With BLE passive auto-sync, this button is unnecessary for end users.
- **"Clear all data"** warning says *"This will permanently delete all recorded events and sync history. This cannot be undone."* — "sync history" is jargon.
- **"Device: WaterTank v3 (ESP32)"** — ESP32 is the microcontroller chip name. Users do not need to know this.

---

## Critical User Flows

### First-time setup (no device)

The user installs the APK. They see:
1. Splash screen
2. Dashboard with "Searching..." + "No signal" + "Waiting for WaterTank device"
3. Subtext tells them: *"Go to Settings → Run Demo to test without hardware"*

**Problems:**
- No instructions on how to connect their actual WaterTank device.
- No "is the device on?" / "is the device near me?" / "is Bluetooth on?" guidance.
- Android 12+ requires runtime BLE permissions (BLUETOOTH_SCAN, BLUETOOTH_CONNECT, ACCESS_FINE_LOCATION) — no rationale/request flow visible.
- The app says "Searching..." indefinitely with no timeout and no "device not found, here are some things to check" panel.
- A villager who installed this without first installing the hardware will be stuck on this screen forever and assume the app is broken.

### Daily use (device connected)

Best-case flow:
1. Open app → Dashboard
2. See tank level, motor state
3. Glance is enough

This flow works for a "is the tank full / is the motor running?" glance. The Dashboard does its job for that case.

**But:**
- The user has to actively open the app to know anything. There is no widget, no quick tile, no lock-screen indicator.
- The "Pump State" + "Motor" + "Air Purge" trio creates uncertainty — three different things, one event.

### When pump starts automatically

The user is asleep at 4 AM when Gram Panchayat water arrives.

- Settings has toggles `notifyMotorOn`, `notifyMotorOff`, `notifyManualOverride`.
- No notification scheduling code is visible in the audited files — the toggles may exist without actually firing. **If notifications are not wired, the central feature for an absent user is silently broken.**
- No "tank is now N% full" in any notification copy.

### When something goes wrong

| Scenario | What the user sees | Verdict |
|---|---|---|
| Device unreachable | Grey blinking dot, "Searching...", "No signal" | Acceptable but no troubleshooting help |
| BLE not available / not granted | Settings: `"BLE requires a native Android build with react-native-ble-plx..."` | Catastrophically jargon-y |
| Motor running unusually long (dry pump?) | No special UI state | No protection alert |
| Tank stuck at low % despite motor running for hours | Nothing | No "something looks wrong" detection |
| Sync clock missing | Events show "Time unknown" | Better than crashing, but no explanation |
| Manual override active | Red banner "⚠ MANUAL OVERRIDE ACTIVE" | Scary, no explanation, no action offered |
| App crash | ErrorFallback: "Something went wrong / Please reload the app" | Decent generic message |

---

## Language & Terminology Issues

| Source string | Where | Why it's bad |
|---|---|---|
| `"Air Purge: 32s remaining"` | Dashboard motor card | Mechanical-engineering jargon |
| `"Air Purge (45s)"` | Pump state label | Same — shown twice |
| `"Pump State"` / `"Supply Detected"` | Dashboard | Engineer language |
| `"Tank Full — Skipped"` | Event list | "Skipped" is unclear |
| `"Synced to Phone"` | Event list | Dev terminology |
| `"Manual Override ON"` / `"⚠ MANUAL OVERRIDE ACTIVE"` | Banner / events | No prior explanation anywhere |
| `"Waiting for WaterTank device"` | Dashboard | "Device" is generic |
| `"Searching..."` | Status dot | Searching for what? |
| `"Demo completed"` / `"One pump cycle simulated"` | Dashboard banner | "Simulated", "pump cycle" |
| `"Run demo cycle"` / `"SIM"` badge | Settings | Demo / simulation are testing concepts |
| `"BLE requires a native Android build with react-native-ble-plx..."` | Settings | Pure developer string |
| `"Show BLE log"` / `"Hide BLE log"` | Settings | BLE is jargon |
| `"No BLE events yet"` | BLE log | Same |
| `"Retention period"` | Settings | Should be "How long to keep history" |
| `"Events stored"` / `"Oldest event"` | Settings | Diagnostic, not user-facing |
| `"Export data (CSV)"` | Settings | CSV is jargon |
| `"Sync now"` | Settings | Jargon |
| `"sync history"` | Clear-data confirmation | Jargon |
| `"Device: WaterTank v3 (ESP32)"` | About | ESP32 is the chip name |
| `"DEBUG"` section header | Settings | Entire section should not exist in production |
| `"No signal"` | Tank bar disconnected | What signal? |
| `"synced 2m ago"` | Status dot | Should be "updated 2 min ago" |
| `"runs"` | Stats / event count | Engineering term for motor cycles |
| `"45s"`, `"1h 23m"` mixed abbreviations | Durations | OK but mixing is inconsistent |
| `"95.1%"` / `"62.5%"` decimal precision | Everywhere | Spurious precision; integers are enough |
| `06:43:12` 24-hour time with seconds | Event rows | India typically uses 12-hour AM/PM |

---

## Missing Features (from a user's perspective)

1. **Onboarding flow** — a 3-screen intro explaining what the app does, that the motor starts automatically, and that BLE pairs itself. Currently nothing.
2. **Hardware pairing UI** — no "Pair device" button. BLE is passive but needs UI to explain: "Bring your phone near the tank. It will connect automatically. The light turns green when connected."
3. **Android 12+ permission prompts with explanations** — BLE permissions need rationale screens; none visible.
4. **Tank level in litres** — user configures tank capacity once (e.g., 1000 L), app shows "650 L of 1000 L".
5. **Estimated time-to-full** — "Tank will be full in ~25 minutes" while motor is running.
6. **Daily summary card on Dashboard** — "Today: 1 fill, water arrived at 6:43 AM, tank now 87%".
7. **Notification of supply arrival** — even before motor starts, knowing supply has come is useful.
8. **Audible alert option** — for tank full / supply cut / dry pump, for users who don't check phone often.
9. **Calendar/date jump in History** — instead of paging one day at a time.
10. **Stats chart** — bar graph of last 7/30 days instead of only a number table.
11. **Water consumed today/this week** — flow sensor data exists (`flowLpm`) but is never displayed to user.
12. **Dry-run / motor protection alert** — firmware supports dry-run detection; no corresponding UI warning.
13. **Multi-language support** — Hindi / Marathi / regional language essential for village audience. App is English-only.
14. **Big-font / accessibility mode** — current 12–14px body text is too small for 50–60 year-old users.
15. **Help / Troubleshooting section** — entirely absent.

---

## Confusing Behaviours

1. **Demo mode is one tap away in Settings** with no warning that it writes fake events to the real database. Running it pollutes History and Stats with fake data permanently, until user finds "Clear all data".
2. **"Pump State: Idle"** on Dashboard — the word "Idle" is fine for an engineer but a user expects "Waiting" or "Nothing happening right now".
3. **Tank bar shows "—" with "No signal"** when disconnected, but the big percentage number disappears entirely. Inconsistent.
4. **Status dot flips between "Connected" and "Searching..."** constantly throughout the day because BLE is passive/intermittent by design. Users will assume the device is broken.
5. **"Tank Full — Skipped"** sounds like an error. User doesn't know why something was skipped.
6. **`formatTime` returns "Time unknown"** for unsynced-clock events. User sees events with no timestamp and doesn't know why.
7. **"Demo completed" banner persists** across screens until dismissed. A user who misses it will keep seeing it days later.
8. **Running demo while real BLE is active** stops the BLE service and restarts it after. Real events during that ~15 seconds are lost.
9. **Tank colour transitions**: green → orange at 80%, orange → red at 95%. Red means *successfully full*, which is what users want — but red signals danger. Should be green / teal / blue for full.
10. **StatusDot pulses 600ms on/off** when disconnected. Continuous blinking looks urgent/broken to a non-technical user.
11. **Inside-bar % label hidden below 20%** — user can't read the level when tank is very low.

---

## Accessibility & Readability

| Element | Size | Verdict |
|---|---|---|
| Tank big % | 36px bold | Excellent |
| "Motor: RUNNING" | 16px semibold | OK |
| Pump State value | 14px semibold | Borderline |
| Event row time | 12px | **Too small** |
| Event row label | 14px medium | OK |
| Event row tank % | 13px | Borderline |
| Settings section header | 11px uppercase + letter-spacing | **Too small; uppercase reduces legibility** |
| BLE note text | 12px | Too small for a critical message |
| Tab labels | 11px | **Too small** |
| Empty state title | 18px | Good |
| Status dot label | 13px | Borderline |

**Contrast:**
- Light mode foreground `#0F172A` on `#F0F7FF` — excellent.
- `mutedForeground` `#6B7F9E` on `#F0F7FF` — acceptable, borderline AAA on small text.
- Dark mode `mutedForeground` `#6B8CAE` on `#060E18` — passes AA, marginal AAA on small text.
- Tank-full red `#EF4444` may appear orange/brown to red-green colour-blind users (8% of males). Use blue for "full" instead.

**Tap targets:**
- Settings rows: `paddingVertical: 14` → ~44pt. Acceptable per WCAG.
- History chevrons: ~42×42pt. Borderline.
- Banner dismiss `✕`: `hitSlop={12}` — OK.

**Other accessibility gaps:**
- No `accessibilityLabel` on tank bar — screen reader hears only "62.5%" with no context.
- No `accessibilityRole` on event rows.
- Fixed pixel font sizes throughout — does not respect OS text scale setting.
- No language attribute set; no Hindi/Marathi locale.

---

## Overall Rating & Priority Fixes

**Rating: 4 / 10 for non-technical village user usability.**

The Dashboard glance-test works — tank bar and motor state are legible. Everything beyond that speaks engineer, not villager. Settings is actively dangerous (DEBUG section, demo mode leaking fake data, raw BLE log exposed). Onboarding is absent. The language throughout assumes familiarity with developer concepts.

### Top 5 Priority Fixes

**1. Remove DEBUG section from production builds.**
Gate behind a hidden 7-tap "version" gesture or a build flag. The "Run Demo" button, BLE log, and BLE diagnostic note (`"BLE requires a native Android build with react-native-ble-plx..."`) must not be visible to real users. Replace with a clean "Hardware status" row: "Connected" or "Not connected" with a help link.

**2. Add one-time onboarding + Hindi/Marathi language support.**
3 screens with illustrations:
- "This app watches your water tank and pump"
- "When village water arrives, the motor will start automatically"
- "Bring your phone near the tank — it will connect by itself. Green dot = connected."
Plus a language picker on first launch.

**3. Rewrite all user-facing strings to plain English.**
- `"Air Purge: 32s remaining"` → `"Motor starting in 32 sec…"` (remove air purge entirely from UI)
- `"Pump State"` card → **remove** (duplicates Motor card)
- `"Supply Detected"` → `"Water arrived"`
- `"Tank Full — Skipped"` → `"Water arrived (tank was already full)"`
- `"Synced to Phone"` → hide from event list
- `"Manual Override"` → `"Pump on by hand"` everywhere
- `"Retention period"` → `"Keep history for"`
- `"Export data (CSV)"` → `"Share my pump history"`
- `"Sync now"` → remove or rename `"Update now"`
- `"Device: WaterTank v3 (ESP32)"` → `"Device: WaterTank v3"`
- `"Searching..."` → `"Looking for your WaterTank…"`
- Use 12-hour time with AM/PM (`6:43 AM` not `06:43:12`)
- Drop all decimal places from tank % (`63%` not `62.5%`)
- Change tank-full colour from red to blue

**4. Add daily summary card on Dashboard + show litres.**
- Add "Tank size" field in Settings (e.g., 1000 L).
- Show `"650 L of 1000 L"` under the big percentage.
- Add card: `"Today: Motor ran 1h 23m, water arrived at 6:43 AM"`.
- Stats: add 7-day bar chart at top + estimated litres pumped per day (using existing `flowLpm`).

**5. Wire notifications + add a Help/Troubleshooting screen.**
- Confirm notifications actually fire — the Settings toggles exist but notification code was not found in audited files.
- Notification copy: `"Motor started — tank is 32% full"`, `"Tank is full. Motor stopped."`, `"Water supply ended. Motor stopped at 67% full."`
- Settings → Help: explain green/orange dots, "what is the red warning", "what to do if device doesn't connect", contact number / WhatsApp.

---

*Audit performed 2026-05-21. Source: watertank-replit-build / artifacts/mobile.*

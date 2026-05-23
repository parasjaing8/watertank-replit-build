# WaterTank — Claude Code Instructions

## Model Routing

### Always Claude (Sonnet/Opus)
- `services/BLEService.ts` — local models invent BLE API methods that don't exist
- `components/WaterTankWidget.tsx` — complex SVG animation, fillPctRef dep traps
- Any change touching 3+ files
- Architectural decisions, audits, security

### Local Model OK (use llama-server port 8080)
- New utility functions (1-2 files, isolated)
- Writing tests for existing logic
- React Native screens with known component props
- Boilerplate / translations / i18n keys
- Mechanical bug fixes in non-BLE, non-animation files

### How to call local model (llama-server, fastest at 52.8 tok/s)
```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.6-moe",
       "messages":[{"role":"user","content":"<TASK>"}],
       "max_tokens":800,
       "chat_template_kwargs":{"enable_thinking":false}}'
```

### aider with local model
```bash
aider \
  --openai-api-base http://127.0.0.1:8080/v1 \
  --openai-api-key none \
  --model openai/qwen3.6-moe \
  --no-auto-commits --yes --no-suggest-shell-commands \
  <file1> [file2]
```

Full benchmark data and lessons: `kb/local_models.md`

---

## Build Protocol

- **Android release:** `expo prebuild` → `cd android && ./gradlew clean && ./gradlew assembleRelease`
- **ALWAYS run `./gradlew clean`** before release builds when any image asset changed (Gradle cache bug — see `kb/session_logs.md` v16-v18)
- Never use `eas build`
- APK output: `android/app/build/outputs/apk/release/app-release.apk`

## Commit Protocol

Commit → push → append `kb/session_logs.md` → update `kb/status.md`. Never batch. Never push without logging.

## Key Invariants (Do Not Break)

- `WaterTankWidget` container: 300×346, `overflow:hidden`
- `TANK_WINDOW = { black: {CX:78,CY:30,CW:175,CH:261}, blue: {CX:70,CY:28,CW:177,CH:258} }`
- `IMG_SCALE = 300/719 = 0.4172` — do not recalculate without re-measuring PNG bounds
- `fillPctRef` pattern — animation interval must not have `fillPct` as a dependency (causes 40× restarts)
- `animState` — wavePhase + pourFlicker merged into single state object (1 setState per tick)
- `getBleManager()` — exported singleton; BlePairingSheet must not create a second BleManager
- `AsyncStorage` is in `dependencies` (not devDependencies) — required for release builds

## Open Issues

See `auditp1.md` (44 findings) and `kb/status.md` for current priority list.
HIGH items all resolved (A1, A3, A11, B1, B2, B8, L1, P1).
MEDIUM items (B3-B10, L3-L12, P2-P4, A2-A12, U1-U6) still open.

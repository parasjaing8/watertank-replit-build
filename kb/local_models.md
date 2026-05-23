# Local Models — WaterTank Project
_Synthesized from llm_tests_M1_max.md + watertank/LESSONS.md, 2026-05-24_

## Speed Ladder (M1 Max 64GB, confirmed 2026-05-18)

```
llama-server MTP   52.8 tok/s  Qwen3.6-35B-A3B IQ3_XXS  port 8080
Ollama             46.6 tok/s  gemma4:26b                port 11434
MTPLX FP16         24.24 tok/s Qwen3.6-27B               port 8000
Ollama              8.2 tok/s  qwen3.6:27b               port 11434
Ollama            145+ tok/s   qwen2.5-coder:1.5b        port 11434 (FIM only)
```

Dense 27B+: 8-10 tok/s. MoE (3.6B active): 27-53 tok/s. Gap: 5-6x.

## Task Routing for This Project

| Task | Model | Backend | Notes |
|---|---|---|---|
| Simple function (1-2 files) | qwen3.6-moe | llama-server port 8080 | no-think mode |
| Write tests | qwen3.6:27b | Ollama port 11434 | |
| React Native component | qwen3.6-moe | llama-server port 8080 | no-think mode |
| Bug fix (isolated) | qwen3.6-moe | llama-server port 8080 | |
| 3+ files / architectural | **Claude Sonnet** | API | always |
| BLEService.ts | **Claude Sonnet** | API | local models invent wrong BLE API |
| WaterTankWidget.tsx | **Claude Sonnet** | API | complex SVG animation, dep traps |
| Audit / security | **Claude Opus** | API | always |
| Architecture decisions | **Claude Opus** | API | always |

## API Endpoints

```bash
# llama-server (fastest, MTP speculative decoding)
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.6-moe",
       "messages":[{"role":"user","content":"..."}],
       "max_tokens":500,
       "chat_template_kwargs":{"enable_thinking":false}}'

# Health check
curl -sf http://127.0.0.1:8080/health

# Ollama (any installed model)
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.6:27b","messages":[{"role":"user","content":"..."}],"max_tokens":500}'
```

## No-Think Mode (Required for Code Gen)

Always use `chat_template_kwargs: {"enable_thinking": false}` for code generation tasks.
- Thinking mode: +30-40% quality on architecture/debug, but 20% slower
- No-think: content field populated immediately, 52+ tok/s

**Does NOT work:** `enable_thinking: false` as top-level param, `<|think_off|>` in system prompt.

## aider with Local Models

```bash
# llama-server (fastest)
aider \
  --openai-api-base http://127.0.0.1:8080/v1 \
  --openai-api-key none \
  --model openai/qwen3.6-moe \
  --no-auto-commits \
  --yes \
  --no-suggest-shell-commands \
  <files>

# Ollama fallback
aider \
  --openai-api-base http://localhost:11434/v1 \
  --openai-api-key none \
  --model openai/qwen3.6:27b \
  --no-auto-commits \
  --yes \
  <files>
```

Critical flags:
- `--no-auto-commits` — MANDATORY; auto-commits leaks 200-line CoT into git history
- `--yes` — required for non-interactive mode
- `--no-suggest-shell-commands` — prevents mid-session interruptions

## Lessons: What Local Models Break in This Codebase

From watertank/LESSONS.md (original firmware project):

1. **Wrong field names** — qwen uses `ev.timestamp` instead of `ev.epochSec`, `event.timestamp` instead of `event.epoch`. Always provide the exact WaterEvent field list in spec.

2. **Invents library API** — On react-native-ble-plx v3, qwen generated entirely invented methods and wrong imports. **Never use local models for BLEService.ts.**

3. **aider whole-edit leaves empty files** — After new file creation via aider, verify file is non-empty. If empty, recover from task output log.

4. **Scope creep** — qwen sometimes edits context/read-only files. List only files to be modified in the spec, not context files.

5. **Component prop names** — qwen guesses prop names across file boundaries. Always include the exact prop signature in the spec.

## Confirmed Working (M1 Max, 2026-05-24)

- llama-server b9190 on port 8080: Qwen3.6-35B-A3B IQ3_XXS
- Ollama 0.24.0 on port 11434: qwen2.5-coder:1.5b, qwen3.6:27b, gemma4:26b
- qwen2.5-coder:1.5b FIM autocomplete: 164ms TTFT (faster than Copilot)

## Cold-Load Warning

`qwen2.5-coder:1.5b` via llama-cli (not llama-server) cold-loads in >120s on M1 Max first run.
Always use Ollama or llama-server (already running) instead of bare llama-cli.
Never use llama-cli subprocess with timeout <300s.

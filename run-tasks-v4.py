#!/usr/bin/env python3
"""
run-tasks-v4.py — WaterTank v4 multi-model aider automation driver
Parses TASKS4.md, routes tasks by **Model:** field:
  local      → Qwen3.6-35B @ http://127.0.0.1:8080/v1
  ollama-27b → qwen3.6:27b @ http://127.0.0.1:11434/v1
  sonnet     → SKIP (Sonnet executes these directly)

Usage:
  python3 run-tasks-v4.py            # run all local+ollama TODO tasks in sequence
  python3 run-tasks-v4.py --dry-run  # print tasks that would run, no execution
  python3 run-tasks-v4.py 64         # run only TASK-064
  python3 run-tasks-v4.py 64 66 67   # run specific tasks
  python3 run-tasks-v4.py --all      # include sonnet tasks (prints them, skips)
"""

import re
import subprocess
import sys
import os
import shutil
from pathlib import Path

TASKS_FILE   = Path(__file__).parent / "TASKS4.md"
LESSONS_FILE = Path(__file__).parent / "LESSONS.md"
AIDER_BIN    = shutil.which("aider") or os.path.expanduser("~/.local/bin/aider")
PROJECT_ROOT = Path(__file__).parent

# Model routing
MODELS = {
    "local": {
        "model":   "openai/Qwen3.6-35B-A3B-MTP-UD-IQ3_XXS.gguf",
        "api_base": "http://127.0.0.1:8080/v1",
        "api_key":  "none",
    },
    "ollama-27b": {
        "model":   "openai/qwen3.6:27b",
        "api_base": "http://127.0.0.1:11434/v1",
        "api_key":  "ollama",
    },
}

# ── Parser ────────────────────────────────────────────────────────────────────

def parse_tasks(content: str) -> list[dict]:
    tasks = []
    pattern = re.compile(
        r'^(## TASK-(\d+): \[(TODO|DONE)\] (.+?))$',
        re.MULTILINE
    )
    headers = list(pattern.finditer(content))

    for i, m in enumerate(headers):
        num    = int(m.group(2))
        status = m.group(3)
        title  = m.group(4).strip()

        start = m.start()
        end   = headers[i + 1].start() if i + 1 < len(headers) else len(content)
        block = content[start:end]

        # Files: handle both inline and list formats
        # "**Files:**\n- `file1`\n- `file2`" or "**Files:**\n- file1, file2"
        files = []
        files_section = re.search(r'\*\*Files:\*\*\s*\n((?:[-•]\s*.+\n?)+)', block)
        if files_section:
            raw = files_section.group(1)
            for line in raw.split('\n'):
                line = line.strip().lstrip('-•').strip().strip('`').strip()
                if line:
                    files.append(line)
        else:
            # Inline fallback
            files_m = re.search(r'\*\*Files:\*\*\s*(.+)', block)
            if files_m:
                files = [f.strip().strip('`') for f in files_m.group(1).split(',') if f.strip()]

        # Model
        model_m = re.search(r'\*\*Model:\*\*\s*`?(\S+?)`?\s*$', block, re.MULTILINE)
        model_tag = model_m.group(1) if model_m else "local"

        # Message (between **Message:** and ---END-MESSAGE---)
        msg_m = re.search(r'\*\*Message:\*\*\s*\n(.*?)---END-MESSAGE---', block, re.DOTALL)
        message = msg_m.group(1).strip() if msg_m else ""

        tasks.append({
            "num":       num,
            "status":    status,
            "title":     title,
            "files":     files,
            "model_tag": model_tag,
            "message":   message,
            "raw_header": m.group(1),
        })

    return tasks


def mark_done(content: str, num: int) -> str:
    return re.sub(
        rf'(## TASK-{num:03d}: )\[TODO\]',
        r'\1[DONE]',
        content
    )


# ── Aider runner ──────────────────────────────────────────────────────────────

def run_task(task: dict, dry_run: bool = False) -> bool:
    num       = task["num"]
    files     = task["files"]
    msg       = task["message"]
    model_tag = task["model_tag"]

    print(f"\n{'='*60}")
    print(f"TASK-{num:03d}: {task['title']}")
    print(f"Model: {model_tag}  |  Files: {', '.join(files)}")
    print(f"{'='*60}")

    if model_tag == "sonnet":
        print("  [SONNET TASK — skipped by runner, execute directly]")
        return None  # None = skipped, not failed

    if not msg:
        print("  ERROR: No message found — skipping")
        return False

    if not files:
        print("  ERROR: No files listed — skipping")
        return False

    route = MODELS.get(model_tag, MODELS["local"])

    # Ensure parent dirs exist
    for f in files:
        (PROJECT_ROOT / f).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        AIDER_BIN,
        "--model",           route["model"],
        "--openai-api-base", route["api_base"],
        "--openai-api-key",  route["api_key"],
        "--no-auto-commits",
        "--yes",
        "--message",         msg,
    ] + files

    print(f"CMD: aider --model {route['model']} [msg {len(msg)}c] {' '.join(files)}")

    if dry_run:
        print("  [DRY RUN]")
        return True

    result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))

    if result.returncode != 0:
        print(f"\n  TASK-{num:03d} FAILED (exit {result.returncode})")
        return False

    ensure_lessons_entry(num, task["title"])
    return True


def ensure_lessons_entry(num: int, title: str):
    content = LESSONS_FILE.read_text() if LESSONS_FILE.exists() else ""
    tag = f"## TASK-{num:03d}"
    if tag in content:
        return
    entry = (
        f"\n{tag}: {title}\n"
        f"- Tricky: \n"
        f"- Learned: \n"
        f"- Deviation: none\n"
    )
    with LESSONS_FILE.open("a") as f:
        f.write(entry)
    print(f"  → LESSONS.md entry added for TASK-{num:03d}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    dry_run     = "--dry-run" in args
    include_all = "--all" in args
    args        = [a for a in args if a not in ("--dry-run", "--all")]
    filter_nums = {int(a) for a in args if a.isdigit()}

    content = TASKS_FILE.read_text()
    tasks   = parse_tasks(content)

    todo = [t for t in tasks if t["status"] == "TODO"]
    if filter_nums:
        todo = [t for t in todo if t["num"] in filter_nums]

    # By default skip sonnet tasks
    if not include_all:
        skipped_sonnet = [t for t in todo if t["model_tag"] == "sonnet"]
        todo = [t for t in todo if t["model_tag"] != "sonnet"]
        if skipped_sonnet:
            print(f"Skipping {len(skipped_sonnet)} SONNET task(s) (run with --all to see them):")
            for t in skipped_sonnet:
                print(f"  TASK-{t['num']:03d}: {t['title']}")
            print()

    if not todo:
        print("No local/ollama TODO tasks found.")
        return

    print(f"Found {len(todo)} task(s) to run:\n")
    for t in todo:
        print(f"  TASK-{t['num']:03d} [{t['model_tag']:10s}]: {t['title']}")

    if dry_run:
        print("\n[DRY RUN] No tasks executed.")
        return

    succeeded = []
    failed    = []
    skipped   = []

    for task in todo:
        ok = run_task(task, dry_run=dry_run)
        if ok is None:
            skipped.append(task["num"])
        elif ok:
            succeeded.append(task["num"])
            content = mark_done(content, task["num"])
            TASKS_FILE.write_text(content)
            print(f"  TASK-{task['num']:03d} marked [DONE] in TASKS4.md")
        else:
            failed.append(task["num"])
            print(f"  Stopping — fix TASK-{task['num']:03d} before continuing.")
            break

    print(f"\n{'='*60}")
    print(f"Done.")
    print(f"  Succeeded: {succeeded}")
    print(f"  Failed:    {failed}")
    print(f"  Skipped:   {skipped}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
run-tasks.py — WaterTank aider automation driver
Parses TASKS.md, runs each [TODO] task via aider against llama-server:8080,
marks tasks [DONE] on success.

Usage:
  python3 run-tasks.py            # run all TODO tasks in sequence
  python3 run-tasks.py --dry-run  # print tasks that would run, no execution
  python3 run-tasks.py 11         # run only TASK-011
  python3 run-tasks.py 11 12 13   # run specific tasks
"""

import re
import subprocess
import sys
import os
import shutil
from pathlib import Path

TASKS_FILE   = Path(__file__).parent / "TASKS.md"
LESSONS_FILE = Path(__file__).parent / "LESSONS.md"
AIDER_BIN    = shutil.which("aider") or os.path.expanduser("~/.local/bin/aider")
MODEL        = "openai/Qwen3.6-35B-A3B-MTP-UD-IQ3_XXS.gguf"
API_BASE     = "http://127.0.0.1:8080/v1"
API_KEY      = "none"
PROJECT_ROOT = Path(__file__).parent

# ── Parser ────────────────────────────────────────────────────────────────────

def parse_tasks(content: str) -> list[dict]:
    """Return list of task dicts with keys: num, status, title, files, message, raw_header."""
    tasks = []
    # Match task headers: ## TASK-NNN: [STATUS] Title
    pattern = re.compile(
        r'^(## TASK-(\d+): \[(TODO|DONE)\] (.+?))$',
        re.MULTILINE
    )
    headers = list(pattern.finditer(content))

    for i, m in enumerate(headers):
        num    = int(m.group(2))
        status = m.group(3)
        title  = m.group(4).strip()

        # Extract block between this header and next
        start = m.start()
        end   = headers[i + 1].start() if i + 1 < len(headers) else len(content)
        block = content[start:end]

        # Files
        files_m = re.search(r'\*\*Files:\*\*\s*(.+)', block)
        files_raw = files_m.group(1).strip() if files_m else ""
        files = [f.strip().strip('`').strip() for f in files_raw.split(',') if f.strip()]

        # Message
        msg_m = re.search(r'\*\*Message:\*\*\s*\n(.*?)---END-MESSAGE---', block, re.DOTALL)
        message = msg_m.group(1).strip() if msg_m else ""

        tasks.append({
            "num":    num,
            "status": status,
            "title":  title,
            "files":  files,
            "message": message,
            "raw_header": m.group(1),
        })

    return tasks


def mark_done(content: str, num: int) -> str:
    """Replace [TODO] with [DONE] for the given task number."""
    return re.sub(
        rf'(## TASK-{num:03d}: )\[TODO\]',
        r'\1[DONE]',
        content
    )


# ── Aider runner ──────────────────────────────────────────────────────────────

def run_task(task: dict, dry_run: bool = False) -> bool:
    num   = task["num"]
    files = task["files"]
    msg   = task["message"]

    print(f"\n{'='*60}")
    print(f"TASK-{num:03d}: {task['title']}")
    print(f"Files: {', '.join(files)}")
    print(f"{'='*60}")

    if not msg:
        print("  ERROR: No message found — skipping")
        return False

    if not files:
        print("  ERROR: No files listed — skipping")
        return False

    # Ensure parent directories exist
    for f in files:
        p = PROJECT_ROOT / f
        p.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        AIDER_BIN,
        "--model",              MODEL,
        "--openai-api-base",    API_BASE,
        "--openai-api-key",     API_KEY,
        "--no-auto-commits",
        "--yes",                # auto-accept all prompts
        "--message",            msg,
    ] + files

    print(f"CMD: aider --model {MODEL} --message '[...{len(msg)} chars]' {' '.join(files)}")

    if dry_run:
        print("  [DRY RUN — not executing]")
        return True

    result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))

    if result.returncode != 0:
        print(f"\n  TASK-{num:03d} FAILED (exit {result.returncode})")
        return False

    ensure_lessons_entry(num, task["title"])
    return True


def ensure_lessons_entry(num: int, title: str):
    """Append a placeholder to LESSONS.md if the task doesn't have an entry yet."""
    content = LESSONS_FILE.read_text() if LESSONS_FILE.exists() else ""
    tag = f"## TASK-{num:03d}"
    if tag in content:
        return  # already present
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
    dry_run   = "--dry-run" in args
    args      = [a for a in args if a != "--dry-run"]
    filter_nums = {int(a) for a in args if a.isdigit()}

    content = TASKS_FILE.read_text()
    tasks   = parse_tasks(content)

    todo = [t for t in tasks if t["status"] == "TODO"]
    if filter_nums:
        todo = [t for t in todo if t["num"] in filter_nums]

    if not todo:
        print("No TODO tasks found (or none matching filter).")
        return

    print(f"Found {len(todo)} TODO task(s) to run.\n")
    for t in todo:
        print(f"  TASK-{t['num']:03d}: {t['title']}")

    if dry_run:
        print("\n[DRY RUN] No tasks executed.")
        return

    succeeded = []
    failed    = []

    for task in todo:
        ok = run_task(task, dry_run=dry_run)
        if ok:
            succeeded.append(task["num"])
            # Update TASKS.md status to DONE
            content = mark_done(content, task["num"])
            TASKS_FILE.write_text(content)
            print(f"  TASK-{task['num']:03d} marked [DONE] in TASKS.md")
        else:
            failed.append(task["num"])
            print(f"  Stopping — fix TASK-{task['num']:03d} before continuing.")
            break

    print(f"\n{'='*60}")
    print(f"Done. Succeeded: {succeeded}  Failed: {failed}")


if __name__ == "__main__":
    main()

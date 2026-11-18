"""The judge's assistant: a headless worker on the Claude Agent SDK that runs on the Max plan's API credit.

Usage:
    python assistant.py --order PATH --name NAME [--model sonnet|opus] [--mode scout|worker] [--config PATH]

The key is read only from the CLAUDE_CONSOLE_KEY environment variable and is handed to the SDK's child
process through ClaudeAgentOptions(env=...). This process never sets ANTHROPIC_API_KEY in its own
environment, and nothing here touches the user or machine environment.

Exit codes: 0 done, 1 run error, 2 CLAUDE_CONSOLE_KEY missing, 3 spend cap reached, 4 credit too low.
"""
from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
KEY_VAR = "CLAUDE_CONSOLE_KEY"

EXIT_OK = 0
EXIT_ERROR = 1
EXIT_NO_KEY = 2
EXIT_CAP = 3
EXIT_CREDIT = 4

DEFAULTS: dict[str, Any] = {
    "monthly_cap_usd": 90,
    "daily_cap_usd": 8,
    "max_turns": 200,
    "kitchen_dir": "%USERPROFILE%\\antigravity\\.fable-kitchen",
    "build_dir": "%USERPROFILE%\\antigravity\\build",
    "ledger_path": "%USERPROFILE%\\antigravity\\.fable-kitchen\\assistant\\ledger.jsonl",
    "run_log_path": "%USERPROFILE%\\antigravity\\.fable-kitchen\\assistant\\runs.log",
}
PATH_KEYS = ("kitchen_dir", "build_dir", "ledger_path", "run_log_path")


# ------------------------------------------------------------------ config, prices, ledger
def _expand(value: str) -> str:
    home = os.environ.get("USERPROFILE", "")
    if not home:
        raise RuntimeError("USERPROFILE is not set; cannot resolve the kitchen paths.")
    value = re.sub(r"%USERPROFILE%", lambda _m: home, value, flags=re.IGNORECASE)
    return os.path.normpath(value.replace("\\", os.sep).replace("/", os.sep))


def load_config(path: str | None) -> dict[str, Any]:
    cfg = dict(DEFAULTS)
    if path:
        cfg.update(json.loads(Path(path).read_text(encoding="utf-8")))
    for k in PATH_KEYS:
        cfg[k] = _expand(str(cfg[k]))
    cfg["monthly_cap_usd"] = float(cfg["monthly_cap_usd"])
    cfg["daily_cap_usd"] = float(cfg["daily_cap_usd"])
    cfg["max_turns"] = int(cfg["max_turns"])
    return cfg


def load_prices(path: Path | None = None) -> dict[str, Any]:
    return json.loads((path or HERE / "prices.json").read_text(encoding="utf-8"))


def estimate_usd(model: str, usage: dict[str, Any], prices: dict[str, Any]) -> float:
    p = prices["models"][model]
    m = 1_000_000.0
    return (
        int(usage.get("input_tokens") or 0) * p["input_per_mtok"] / m
        + int(usage.get("cache_creation_input_tokens") or 0) * p.get("cache_write_5m_per_mtok", p["input_per_mtok"]) / m
        + int(usage.get("cache_read_input_tokens") or 0) * p.get("cache_read_per_mtok", p["input_per_mtok"]) / m
        + int(usage.get("output_tokens") or 0) * p["output_per_mtok"] / m
    )


def read_ledger(path: str) -> list[dict[str, Any]]:
    p = Path(path)
    if not p.exists():
        return []
    out = []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def day_total(entries: list[dict[str, Any]], today: dt.date) -> float:
    d = today.isoformat()
    return sum(float(e.get("usd") or 0) for e in entries if str(e.get("date", "")) == d)


def month_total(entries: list[dict[str, Any]], today: dt.date) -> float:
    m = today.strftime("%Y-%m")
    return sum(float(e.get("usd") or 0) for e in entries if str(e.get("date", "")).startswith(m))


def _append(path: str, line: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(line.rstrip("\n") + "\n")


# ------------------------------------------------------------------ the guard (pure Python)
READ_TOOLS = {"Read", "Glob", "Grep", "LS", "WebSearch", "WebFetch", "TodoWrite"}
WRITE_TOOLS = {"Write", "Edit", "MultiEdit", "NotebookEdit"}
SHELL_TOOLS = {"Bash", "PowerShell"}
PATH_FIELDS = ("file_path", "path", "notebook_path")

SECRET_RE = re.compile(r"secret|key|token|vault|password|passwd|credential|\.ssh|\.aws|\.gnupg|id_rsa|id_ed25519|\.pem\b|\.pfx\b")
ENV_FILE_RE = re.compile(r"(^|[\\/\s\"'=:(])\.env(\b|$)|\.env\.[a-z]|[a-z0-9_-]\.env\b", re.IGNORECASE)
ENV_DUMP_RE = re.compile(r"\$env:|\benv:|\bprintenv\b|^\s*env\b|[;&|]\s*env\b|^\s*set\s*$|[;&|]\s*set\s*$|\bget-childitem\s+env|\bgci\s+env|\bdir\s+env|\bls\s+env|\[environment\]|getenvironmentvariable|os\.environ|process\.env")
FORBIDDEN_RE = re.compile(r"(?<![a-z0-9_-])(hermes|grin-droid|grindroid|mira|trolly)(?![a-z0-9_-])", re.IGNORECASE)
DELETE_RE = re.compile(
    r"(?<![\w-])(rm|del|erase|rmdir|rd|ri|remove-item|unlink|shred|rimraf|clear-content|clc|format)(?![\w-])"
    r"|\bgit\s+(rm|clean)\b|\bgit\s+branch\b.*\s(-d|-D|--delete)\b|\bgit\s+push\b.*(--delete|\s-d\b|\s:\S)"
    r"|\bgit\s+reset\s+--hard|\bgit\s+tag\s+.*-d\b|\bgit\s+worktree\s+remove|\bgit\s+stash\s+(drop|clear)"
    r"|\.(unlink|rmtree|remove)\(|\bdelete\b",
    re.IGNORECASE,
)
TASK_RE = re.compile(r"schtasks|scheduledtask|scheduledjob|\bcrontab\b|\bat\s+\d", re.IGNORECASE)
WINDOW_RE = re.compile(
    r"(?<![\w-])(start|explorer|explorer\.exe|notepad|notepad\+\+|invoke-item|ii|code|code-insiders|chrome|msedge|firefox|iexplore|brave|opera"
    r"|saps|mspaint|calc|write|wordpad|powershell_ise|wt|xdg-open|open|rundll32|mshta|wscript|cscript|cmd\s+/c\s+start|osascript|show-command|out-gridview|ogv)(?![\w-])",
    re.IGNORECASE,
)
START_PROCESS_RE = re.compile(r"start-process", re.IGNORECASE)
NO_VERIFY_RE = re.compile(r"--no-verify|\bgit\s+commit\b.*\s-[a-z]*n[a-z]*\b", re.IGNORECASE)
ABS_PATH_RE = re.compile(r"(?<![\w])([a-zA-Z]:[\\/][^\s\"'|;&<>]*)|(?<![\w.])(~[\\/][^\s\"'|;&<>]*)|(\\\\[^\s\"'|;&<>]+)")

SCOUT_COMMANDS = {
    "ls", "dir", "cat", "type", "head", "tail", "wc", "get-content", "gc", "get-childitem", "gci", "select-string",
    "sls", "rg", "grep", "findstr", "pwd", "get-location", "test-path", "get-item", "where-object", "select-object",
    "sort-object", "measure-object", "format-table", "format-list", "out-string", "sort", "uniq", "echo", "write-output",
    "git", "gh", "tree", "find", "diff", "compare-object", "get-filehash", "where", "?", "%", "foreach-object",
}
SCOUT_GIT = {"status", "log", "diff", "show", "grep", "ls-files", "rev-parse", "branch", "remote", "fetch", "blame", "shortlog", "describe", "ls-tree", "cat-file"}
SCOUT_GH = {("pr", "view"), ("pr", "list"), ("pr", "diff"), ("pr", "checks"), ("pr", "status"), ("issue", "view"), ("issue", "list"), ("repo", "view"), ("run", "list"), ("run", "view")}


def _roots(cfg: dict[str, Any]) -> list[str]:
    return [os.path.normcase(os.path.abspath(cfg["build_dir"])), os.path.normcase(os.path.abspath(cfg["kitchen_dir"]))]


def _under(path: str, cfg: dict[str, Any]) -> str | None:
    """Return the part of path below an allowed root, or None when it is outside both roots."""
    raw = os.path.expanduser(path)
    if not os.path.isabs(raw):
        raw = os.path.join(cfg["build_dir"], raw)
    full = os.path.normcase(os.path.abspath(raw))
    for r in _roots(cfg):
        try:
            if os.path.commonpath([full, r]) == r:
                return full[len(r):]
        except ValueError:
            continue
    return None


def _path_problem(path: str, cfg: dict[str, Any]) -> str | None:
    rel = _under(path, cfg)
    if rel is None:
        return "path is outside the build and kitchen folders"
    low = rel.lower()
    if ENV_FILE_RE.search(low):
        return "env files are never read"
    if SECRET_RE.search(low):
        return "paths named like a secret, key, token or vault are refused"
    if FORBIDDEN_RE.search(low):
        return "that folder is off limits"
    return None


def _push_problem(cmd: str, mode: str) -> str | None:
    if mode != "worker":
        return "scout mode never pushes"
    if re.search(r"(^|\s)(--force\S*|-f|--mirror|--all|--tags|--prune)(\s|$)", cmd) or re.search(r"\s-[a-z]*f[a-z]*(\s|$)", cmd):
        return "force push is refused"
    seg = re.split(r"[;&|]", cmd[cmd.lower().index("push"):])[0]
    args = [a for a in seg.split()[1:] if not a.startswith("-")]
    if len(args) < 2:
        return "push must name a remote and a branch explicitly"
    for spec in args[1:]:
        if spec.startswith("+"):
            return "force refspec is refused"
        dst = spec.split(":")[-1].lower()
        dst = dst.removeprefix("refs/heads/")
        if dst in {"main", "master", "head", ""}:
            return "push to main is refused"
    return None


def _scout_shell_problem(cmd: str) -> str | None:
    if re.search(r">|\$\(|`|\binvoke-expression\b|\biex\b|&\s*[\"'$]", cmd, re.IGNORECASE):
        return "scout mode shell is read-only (no redirection or sub-commands)"
    for seg in re.split(r"\|\||&&|[;|]", cmd):
        words = seg.strip().split()
        if not words:
            continue
        head = words[0].lower()
        if head not in SCOUT_COMMANDS:
            return f"scout mode does not run {head}"
        if head == "git":
            sub = next((w for w in words[1:] if not w.startswith("-")), "")
            if sub not in SCOUT_GIT:
                return f"scout mode does not run git {sub}"
            if sub == "branch" and any(w not in ("-a", "-r", "--list", "-v", "-vv", "--show-current") for w in words[2:]):
                return "scout mode only lists branches"
            if sub == "remote" and any(w not in ("-v",) for w in words[2:]):
                return "scout mode only lists remotes"
        if head == "gh":
            pair = tuple(w for w in words[1:3])
            if pair not in SCOUT_GH:
                return "scout mode only reads from gh"
    return None


def _shell_problem(cmd: str, mode: str, cfg: dict[str, Any]) -> str | None:
    low = cmd.lower()
    if ENV_FILE_RE.search(low):
        return "env files are never read"
    if ENV_DUMP_RE.search(low):
        return "environment dumps are refused"
    if SECRET_RE.search(low):
        return "commands naming a secret, key, token or vault are refused"
    if FORBIDDEN_RE.search(low):
        return "that folder is off limits"
    if NO_VERIFY_RE.search(cmd):
        return "--no-verify is refused"
    if TASK_RE.search(low):
        return "scheduled tasks are refused"
    if START_PROCESS_RE.search(low):
        if not re.search(r"-windowstyle\s+hidden", low) or mode != "worker":
            return "anything that opens a window is refused"
    elif WINDOW_RE.search(low):
        return "anything that opens a window is refused"
    if DELETE_RE.search(cmd):
        return "delete commands are refused"
    if re.search(r"\bgit\b.*\bpush\b", low):
        p = _push_problem(cmd, mode)
        if p:
            return p
    for m in ABS_PATH_RE.finditer(cmd):
        p = next(x for x in m.groups() if x)
        prob = _path_problem(p, cfg)
        if prob:
            return prob
    if mode == "scout":
        return _scout_shell_problem(cmd)
    return None


def guard(tool_name: str, tool_input: dict[str, Any], mode: str, cfg: dict[str, Any]) -> tuple[bool, str]:
    """Decide one tool call. Returns (allowed, reason). Denies whenever unsure."""
    tool_input = tool_input or {}
    if mode not in ("scout", "worker"):
        return False, "unknown mode"
    if tool_name in SHELL_TOOLS:
        cmd = str(tool_input.get("command") or "")
        if not cmd.strip():
            return False, "empty command"
        prob = _shell_problem(cmd, mode, cfg)
        return (prob is None), (prob or "ok")
    if tool_name in READ_TOOLS or tool_name in WRITE_TOOLS:
        if tool_name in WRITE_TOOLS and mode != "worker":
            return False, "scout mode is read-only"
        blob = json.dumps(tool_input).lower()
        if tool_name in ("Glob", "Grep") and (ENV_FILE_RE.search(blob) or SECRET_RE.search(str(tool_input.get("pattern", "")).lower()) or FORBIDDEN_RE.search(blob)):
            return False, "pattern names an env file, a secret or an off-limits folder"
        if tool_name in ("WebSearch", "WebFetch", "TodoWrite"):
            if tool_name != "TodoWrite" and (SECRET_RE.search(str(tool_input.get("url", "")).lower()) or ENV_FILE_RE.search(blob)):
                return False, "request names a secret"
            return True, "ok"
        paths = [str(tool_input[f]) for f in PATH_FIELDS if tool_input.get(f)]
        if tool_name in WRITE_TOOLS and not paths:
            return False, "write without a path"
        for p in paths:
            prob = _path_problem(p, cfg)
            if prob:
                return False, prob
        return True, "ok"
    return False, f"tool {tool_name} is not allowed"


# ------------------------------------------------------------------ running the order
CREDIT_RE = re.compile(r"credit balance is too low|credit balance too low|insufficient credit|billing_error", re.IGNORECASE)


class CreditTooLow(Exception):
    pass


def _redact(text: str, secret: str) -> str:
    return text.replace(secret, "[redacted]") if secret else text


def _build_options(sdk: Any, model_id: str, mode: str, cfg: dict[str, Any], key: str, budget: float) -> Any:
    async def can_use_tool(tool_name: str, tool_input: dict[str, Any], context: Any) -> Any:
        ok, reason = guard(tool_name, tool_input, mode, cfg)
        if ok:
            return sdk.PermissionResultAllow()
        return sdk.PermissionResultDeny(message=f"Refused by the assistant guard: {reason}")

    async def pre_tool_use(input_data: dict[str, Any], tool_use_id: str | None, context: Any) -> dict[str, Any]:
        ok, reason = guard(input_data.get("tool_name", ""), input_data.get("tool_input") or {}, mode, cfg)
        if ok:
            return {}
        return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                       "permissionDecisionReason": f"Refused by the assistant guard: {reason}"}}

    disallowed = ["Task", "Agent", "KillShell", "KillBash"]
    if mode == "scout":
        disallowed += sorted(WRITE_TOOLS)
    child_env = {
        "ANTHROPIC_API_KEY": key,  # child process only; never set in os.environ
        KEY_VAR: "",
        "CLAUDE_CODE_OAUTH_TOKEN": "",
        "ANTHROPIC_AUTH_TOKEN": "",
    }
    return sdk.ClaudeAgentOptions(
        model=model_id,
        env=child_env,
        cwd=cfg["build_dir"],
        permission_mode="default",
        can_use_tool=can_use_tool,
        hooks={"PreToolUse": [sdk.HookMatcher(matcher=None, hooks=[pre_tool_use])]},
        disallowed_tools=disallowed,
        setting_sources=[],
        max_turns=cfg["max_turns"],
        max_budget_usd=max(budget, 0.01),
    )


async def _prompt_stream(text: str):
    yield {"type": "user", "message": {"role": "user", "content": text}, "parent_tool_use_id": None, "session_id": "default"}


async def run_agent(prompt: str, options: Any, sdk: Any) -> dict[str, Any]:
    usage: dict[str, Any] = {}
    result_text = ""
    status = "ok"
    async for msg in sdk.query(prompt=_prompt_stream(prompt), options=options):
        err = getattr(msg, "error", None)
        if err and CREDIT_RE.search(str(err)):
            status = "credit_too_low"
        if hasattr(msg, "subtype") and hasattr(msg, "is_error"):
            usage = dict(getattr(msg, "usage", None) or {})
            result_text = str(getattr(msg, "result", "") or "")
            if getattr(msg, "is_error", False):
                if CREDIT_RE.search(result_text) or status == "credit_too_low":
                    status = "credit_too_low"
                else:
                    status = f"error:{getattr(msg, 'subtype', 'unknown')}"
    return {"usage": usage, "result": result_text, "status": status}


def _parse(argv: list[str] | None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="The judge's assistant on the Max API credit (Claude Agent SDK).")
    ap.add_argument("--order", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--model", choices=["sonnet", "opus"], default="sonnet")
    ap.add_argument("--mode", choices=["scout", "worker"], default="scout")
    ap.add_argument("--config", default=str(HERE / "config.json"))
    return ap.parse_args(argv)


def _prompt_for(order_path: Path, mode: str, report_path: Path) -> str:
    rules = (
        "You are the judge's assistant, running headless with no human watching. "
        f"Mode: {mode}. "
        + ("Scout mode: read only. Do not write, edit, commit or push anything; your final answer becomes the report. "
           if mode == "scout" else
           "Worker mode: you may write under the build folder and the kitchen folder and push feature branches, never main. ")
        + "Never read .env files or anything named like a secret, key, token or vault. Never delete anything. "
        "Never open a window. Never create scheduled tasks. Never use --force or --no-verify. "
        f"Do the order below to the end, then finish with a short plain summary of what you did and what is left. "
        f"The Python wrapper writes your summary to {report_path.name}.\n\n"
    )
    return rules + "---- ORDER ----\n" + order_path.read_text(encoding="utf-8", errors="replace")


def main(argv: list[str] | None = None) -> int:
    args = _parse(argv)
    key = (os.environ.get(KEY_VAR) or "").strip()
    if not key:
        print(f"{KEY_VAR} is not set: put it in the node env file and start through run-assistant.ps1.")
        return EXIT_NO_KEY

    cfg = load_config(args.config if args.config and Path(args.config).exists() else None)
    prices = load_prices()
    model_id = prices["models"][args.model]["id"]
    kitchen_orders = Path(cfg["kitchen_dir"]) / "orders"
    kitchen_orders.mkdir(parents=True, exist_ok=True)
    report_path = kitchen_orders / f"{args.name}.report.md"
    today = dt.date.today()
    started = dt.datetime.now().astimezone()

    def finish(status: str, code: int, usage: dict[str, Any], usd: float, result: str, ledger: bool) -> int:
        in_tok = sum(int(usage.get(k) or 0) for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
        out_tok = int(usage.get("output_tokens") or 0)
        if ledger:
            _append(cfg["ledger_path"], json.dumps({
                "date": today.isoformat(), "time": started.isoformat(timespec="seconds"), "order": args.name,
                "order_file": _redact(str(args.order), key), "model": model_id, "mode": args.mode,
                "input_tokens": in_tok, "output_tokens": out_tok, "usd": round(usd, 6), "status": status,
            }))
        report = (
            f"# {args.name} report\n\n"
            f"- Order: {args.order}\n- Model: {model_id}\n- Mode: {args.mode}\n- Started: {started.isoformat(timespec='seconds')}\n"
            f"- Status: {status} (exit {code})\n- Tokens: {in_tok} in, {out_tok} out\n- Estimated cost: ${usd:.4f} "
            f"(prices from {prices['source']}, read {prices['retrieved']})\n\n## Result\n\n{result or '(no result text)'}\n"
        )
        report_path.write_text(_redact(report, key), encoding="utf-8")
        _append(cfg["run_log_path"], _redact(
            f"{dt.datetime.now().astimezone().isoformat(timespec='seconds')} {args.name} model={model_id} mode={args.mode} "
            f"status={status} exit={code} in={in_tok} out={out_tok} usd={usd:.4f} report={report_path}", key))
        print(_redact(f"{args.name}: {status} (exit {code}), report {report_path}", key))
        return code

    order_path = Path(args.order)
    if not order_path.is_file():
        return finish("order_not_found", EXIT_ERROR, {}, 0.0, f"Order file not found: {args.order}", ledger=False)

    entries = read_ledger(cfg["ledger_path"])
    spent_day, spent_month = day_total(entries, today), month_total(entries, today)
    if spent_month >= cfg["monthly_cap_usd"]:
        return finish("refused_monthly_cap", EXIT_CAP, {}, 0.0,
                      f"This month's estimate ${spent_month:.2f} reached the monthly cap ${cfg['monthly_cap_usd']:.2f}.", ledger=False)
    if spent_day >= cfg["daily_cap_usd"]:
        return finish("refused_daily_cap", EXIT_CAP, {}, 0.0,
                      f"Today's estimate ${spent_day:.2f} reached the daily cap ${cfg['daily_cap_usd']:.2f}.", ledger=False)
    budget = min(cfg["daily_cap_usd"] - spent_day, cfg["monthly_cap_usd"] - spent_month)

    try:
        import claude_agent_sdk as sdk
    except ImportError:
        return finish("sdk_missing", EXIT_ERROR, {}, 0.0, "claude-agent-sdk is not installed in this Python.", ledger=False)

    options = _build_options(sdk, model_id, args.mode, cfg, key, budget)
    try:
        out = asyncio.run(run_agent(_prompt_for(order_path, args.mode, report_path), options, sdk))
    except Exception as exc:  # one attempt only, never retried
        text = _redact(f"{type(exc).__name__}: {exc}", key)
        if CREDIT_RE.search(text):
            return finish("credit_too_low", EXIT_CREDIT, {}, 0.0, "The API reported the credit balance is too low. Stopped, not retried.", ledger=True)
        return finish("error", EXIT_ERROR, {}, 0.0, text, ledger=True)

    usage = out["usage"]
    usd = estimate_usd(args.model, usage, prices)
    if out["status"] == "credit_too_low":
        return finish("credit_too_low", EXIT_CREDIT, usage, usd, "The API reported the credit balance is too low. Stopped, not retried.", ledger=True)
    if out["status"] != "ok":
        return finish(out["status"], EXIT_ERROR, usage, usd, out["result"], ledger=True)
    return finish("ok", EXIT_OK, usage, usd, out["result"], ledger=True)


if __name__ == "__main__":
    sys.exit(main())

"""Tests for the judge's assistant. The Claude Agent SDK is fully mocked; no network, no real key."""
from __future__ import annotations

import asyncio
import datetime as dt
import json
import os
import sys
import types
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

FAKE = "FAKE-CONSOLE-VALUE-FOR-TESTS-ONLY"


# ---------------------------------------------------------------- fake SDK
class FakeSDK:
    def __init__(self, mode="ok", usage=None):
        self.mode = mode
        self.usage = usage or {"input_tokens": 1000, "output_tokens": 500}
        self.calls = []

    def module(self):
        sdk = self
        m = types.ModuleType("claude_agent_sdk")

        class ClaudeAgentOptions:
            def __init__(self, **kw):
                self.__dict__.update(kw)
                self.kw = kw

        class HookMatcher:
            def __init__(self, matcher=None, hooks=None, timeout=None):
                self.matcher, self.hooks, self.timeout = matcher, hooks or [], timeout

        class PermissionResultAllow:
            def __init__(self, **kw):
                self.behavior = "allow"

        class PermissionResultDeny:
            def __init__(self, message="", interrupt=False):
                self.behavior, self.message = "deny", message

        class ResultMessage:
            def __init__(self, **kw):
                self.__dict__.update(kw)

        class AssistantMessage:
            def __init__(self, **kw):
                self.__dict__.update(kw)

        class ClaudeSDKError(Exception):
            pass

        async def query(*, prompt, options=None, transport=None):
            sdk.calls.append(options)
            sdk.env_during_run = dict(os.environ)
            if sdk.mode == "credit_low_exc":
                raise ClaudeSDKError("Your credit balance is too low to access the Anthropic API.")
            if sdk.mode == "credit_low_msg":
                yield AssistantMessage(content=[], model="m", error="billing_error")
                yield ResultMessage(subtype="success", is_error=True, usage={"input_tokens": 0, "output_tokens": 0},
                                    result="Credit balance is too low", api_error_status=400, total_cost_usd=0.0)
                return
            yield AssistantMessage(content=[], model="m", error=None)
            yield ResultMessage(subtype="success", is_error=False, usage=sdk.usage,
                                result=f"done; the key was {FAKE}", api_error_status=None, total_cost_usd=0.01)

        for k, v in dict(ClaudeAgentOptions=ClaudeAgentOptions, HookMatcher=HookMatcher,
                         PermissionResultAllow=PermissionResultAllow, PermissionResultDeny=PermissionResultDeny,
                         ResultMessage=ResultMessage, AssistantMessage=AssistantMessage,
                         ClaudeSDKError=ClaudeSDKError, query=query).items():
            setattr(m, k, v)
        return m


@pytest.fixture
def env(tmp_path, monkeypatch):
    home = tmp_path / "home"
    kitchen = home / "antigravity" / ".fable-kitchen"
    (kitchen / "orders").mkdir(parents=True)
    (home / "antigravity" / "build").mkdir(parents=True)
    monkeypatch.setenv("USERPROFILE", str(home))
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("CLAUDE_CONSOLE_KEY", FAKE)
    order = kitchen / "orders" / "ORDER-TEST.md"
    order.write_text("# Order\nSay hello.\n", encoding="utf-8")
    import assistant
    cfg = assistant.load_config(None)
    return types.SimpleNamespace(home=home, kitchen=kitchen, order=order, cfg=cfg, assistant=assistant)


def install(monkeypatch, fake):
    monkeypatch.setitem(sys.modules, "claude_agent_sdk", fake.module())
    return fake


def run(e, *extra):
    return e.assistant.main(["--order", str(e.order), "--name", "t1", *extra])


def all_written(e):
    out = []
    for p in e.home.rglob("*"):
        if p.is_file() and p != e.order:
            out.append(p.read_text(encoding="utf-8", errors="replace"))
    return out


def ledger_lines(e):
    p = Path(e.cfg["ledger_path"])
    return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()] if p.exists() else []


def seed_ledger(e, entries):
    p = Path(e.cfg["ledger_path"])
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        for x in entries:
            f.write(json.dumps(x) + "\n")


TODAY = dt.date.today()


# ---------------------------------------------------------------- the key
def test_missing_setting_exits_2_and_names_it(env, monkeypatch, capsys):
    fake = install(monkeypatch, FakeSDK())
    monkeypatch.delenv("CLAUDE_CONSOLE_KEY", raising=False)
    assert run(env) == 2
    out = capsys.readouterr()
    lines = [l for l in (out.out + out.err).splitlines() if l.strip()]
    assert len(lines) == 1 and "CLAUDE_CONSOLE_KEY" in lines[0]
    assert fake.calls == []


def test_empty_setting_exits_2(env, monkeypatch, capsys):
    install(monkeypatch, FakeSDK())
    monkeypatch.setenv("CLAUDE_CONSOLE_KEY", "   ")
    assert run(env) == 2


def test_no_fallback_to_other_variable(env, monkeypatch):
    fake = install(monkeypatch, FakeSDK())
    monkeypatch.delenv("CLAUDE_CONSOLE_KEY", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "OTHER-FAKE-VALUE")
    assert run(env) == 2
    assert fake.calls == []


def test_value_goes_only_to_child_env_and_parent_stays_clean(env, monkeypatch):
    fake = install(monkeypatch, FakeSDK())
    assert run(env) == 0
    opts = fake.calls[0]
    assert opts.env["ANTHROPIC_API_KEY"] == FAKE
    assert "ANTHROPIC_API_KEY" not in os.environ
    assert "ANTHROPIC_API_KEY" not in fake.env_during_run
    assert opts.model == "claude-sonnet-5-5"


def test_fake_value_never_written_anywhere(env, monkeypatch, capsys):
    install(monkeypatch, FakeSDK())
    assert run(env) == 0
    texts = all_written(env)
    assert texts, "expected report, ledger and run log"
    for t in texts:
        assert FAKE not in t
    out = capsys.readouterr()
    assert FAKE not in out.out + out.err
    report = env.kitchen / "orders" / "t1.report.md"
    assert report.exists()
    assert len(ledger_lines(env)) == 1
    assert Path(env.cfg["run_log_path"]).read_text(encoding="utf-8").count("\n") == 1


def test_only_two_models(env, monkeypatch):
    fake = install(monkeypatch, FakeSDK())
    assert run(env, "--model", "opus") == 0
    assert fake.calls[0].model == "claude-opus-5-5"
    with pytest.raises(SystemExit):
        run(env, "--model", "haiku")


# ---------------------------------------------------------------- spend guard
def test_ledger_sums_and_estimate(env):
    a = env.assistant
    prices = a.load_prices()
    assert a.estimate_usd("sonnet", {"input_tokens": 1_000_000, "output_tokens": 1_000_000}, prices) == pytest.approx(12.0)
    assert a.estimate_usd("opus", {"input_tokens": 500_000, "output_tokens": 100_000}, prices) == pytest.approx(4.0)
    last_month = (TODAY.replace(day=1) - dt.timedelta(days=1)).isoformat()
    entries = [
        {"date": TODAY.isoformat(), "usd": 1.25},
        {"date": TODAY.isoformat(), "usd": 0.75},
        {"date": last_month, "usd": 50.0},
    ]
    if TODAY.day > 1:
        entries.append({"date": TODAY.replace(day=1).isoformat(), "usd": 3.0})
    assert a.day_total(entries, TODAY) == pytest.approx(2.0)
    assert a.month_total(entries, TODAY) == pytest.approx(2.0 + (3.0 if TODAY.day > 1 else 0))


def test_run_records_tokens_and_dollars(env, monkeypatch):
    install(monkeypatch, FakeSDK(usage={"input_tokens": 1000, "output_tokens": 500}))
    assert run(env) == 0
    (line,) = ledger_lines(env)
    assert line["order"] == "t1" and line["model"] == "claude-sonnet-5-5"
    assert line["input_tokens"] == 1000 and line["output_tokens"] == 500
    assert line["usd"] == pytest.approx(1000 * 2 / 1e6 + 500 * 10 / 1e6)
    assert line["date"] == TODAY.isoformat() and line["status"] == "ok"


def test_monthly_cap_refuses(env, monkeypatch):
    fake = install(monkeypatch, FakeSDK())
    seed_ledger(env, [{"date": TODAY.isoformat(), "usd": 0.5}, {"date": TODAY.replace(day=1).isoformat(), "usd": 89.6}])
    # daily sum is below 8 only when the 89.6 line is not today; keep the test honest on day 1
    if TODAY.day == 1:
        pytest.skip("on day 1 the daily cap fires first")
    assert run(env) == env.assistant.EXIT_CAP
    assert fake.calls == []


def test_daily_cap_refuses(env, monkeypatch):
    fake = install(monkeypatch, FakeSDK())
    seed_ledger(env, [{"date": TODAY.isoformat(), "usd": 8.0}])
    assert run(env) == env.assistant.EXIT_CAP
    assert fake.calls == []


def test_caps_come_from_config(env, monkeypatch, tmp_path):
    fake = install(monkeypatch, FakeSDK())
    cfg = tmp_path / "c.json"
    cfg.write_text(json.dumps({"daily_cap_usd": 0.5}), encoding="utf-8")
    seed_ledger(env, [{"date": TODAY.isoformat(), "usd": 0.6}])
    assert run(env, "--config", str(cfg)) == env.assistant.EXIT_CAP
    assert fake.calls == []
    assert env.assistant.load_config(None)["monthly_cap_usd"] == 90
    assert env.assistant.load_config(None)["daily_cap_usd"] == 8


@pytest.mark.parametrize("mode", ["credit_low_exc", "credit_low_msg"])
def test_credit_too_low_stops_once_and_is_recorded(env, monkeypatch, mode):
    fake = install(monkeypatch, FakeSDK(mode=mode))
    assert run(env) == env.assistant.EXIT_CREDIT
    assert len(fake.calls) == 1
    (line,) = ledger_lines(env)
    assert line["status"] == "credit_too_low"
    assert env.assistant.EXIT_CREDIT not in (0, 1, 2, env.assistant.EXIT_CAP)


# ---------------------------------------------------------------- the guard
def g(e, tool, inp, mode="worker"):
    allowed, reason = e.assistant.guard(tool, inp, mode, e.cfg)
    return allowed


@pytest.mark.parametrize("mode", ["scout", "worker"])
def test_guard_blocks_env_reads(env, mode):
    b = env.home / "antigravity" / "build"
    assert not g(env, "Read", {"file_path": str(b / "repo" / ".env")}, mode)
    assert not g(env, "Read", {"file_path": str(b / "repo" / ".env.local")}, mode)
    assert not g(env, "Bash", {"command": "cat .env"}, mode)
    assert not g(env, "Bash", {"command": "Get-Content C:\\x\\.env"}, mode)
    assert not g(env, "Grep", {"pattern": "x", "path": str(b / "repo" / ".env")}, mode)
    assert not g(env, "Read", {"file_path": str(b / "repo" / "secrets.json")}, mode)
    assert not g(env, "Read", {"file_path": str(b / "repo" / "api_key.txt")}, mode)
    assert not g(env, "Bash", {"command": "echo $env:ANTHROPIC_API_KEY"}, mode)
    assert not g(env, "Bash", {"command": "printenv"}, mode)
    assert not g(env, "Bash", {"command": "type vault\\notes.md"}, mode)
    assert not g(env, "Bash", {"command": "gh auth token"}, mode)


@pytest.mark.parametrize("mode", ["scout", "worker"])
@pytest.mark.parametrize("cmd", [
    "rm -rf build", "del foo.txt", "Remove-Item x -Recurse", "rmdir /s x", "rd x", "git rm a.txt",
    "git clean -fdx", "git branch -D feat/x", "erase a", "ri x", "git push origin --delete feat/x",
])
def test_guard_blocks_deletes(env, mode, cmd):
    assert not g(env, "Bash", {"command": cmd}, mode)


@pytest.mark.parametrize("cmd", [
    "git push origin main", "git push origin HEAD:main", "git push", "git push origin master",
    "git push --force origin feat/x", "git push -f origin feat/x", "git push origin +feat/x",
    "git push --force-with-lease origin feat/x", "git commit --no-verify -m x", "git push --no-verify origin feat/x",
])
def test_guard_blocks_unsafe_push(env, cmd):
    assert not g(env, "Bash", {"command": cmd}, "worker")


def test_worker_may_push_a_branch_scout_may_not(env):
    assert g(env, "Bash", {"command": "git push -u origin feat/x"}, "worker")
    assert not g(env, "Bash", {"command": "git push -u origin feat/x"}, "scout")


@pytest.mark.parametrize("cmd", [
    "schtasks /create /tn x /tr y", "Register-ScheduledTask -TaskName x", "New-ScheduledTaskTrigger -Daily",
    "Start-Process notepad", "start https://example.com", "explorer .", "notepad a.txt", "Invoke-Item a.html",
    "ii a.html", "code .", "chrome https://x", "msedge https://x",
])
@pytest.mark.parametrize("mode", ["scout", "worker"])
def test_guard_blocks_tasks_and_windows(env, cmd, mode):
    assert not g(env, "Bash", {"command": cmd}, mode)


@pytest.mark.parametrize("folder", ["hermes", "grin-droid", "GrinDroid", "mira", "trolly"])
@pytest.mark.parametrize("mode", ["scout", "worker"])
def test_guard_blocks_forbidden_folders(env, folder, mode):
    b = env.home / "antigravity" / "build"
    assert not g(env, "Read", {"file_path": str(b / folder / "a.md")}, mode)
    assert not g(env, "Bash", {"command": f"ls {folder}/src"}, mode)


def test_guard_scout_is_read_only(env):
    b = env.home / "antigravity" / "build"
    assert g(env, "Read", {"file_path": str(b / "repo" / "README.md")}, "scout")
    assert g(env, "Bash", {"command": "git status"}, "scout")
    assert not g(env, "Write", {"file_path": str(b / "repo" / "a.md"), "content": "x"}, "scout")
    assert not g(env, "Edit", {"file_path": str(b / "repo" / "a.md")}, "scout")
    assert not g(env, "Bash", {"command": "echo hi > a.txt"}, "scout")
    assert not g(env, "Bash", {"command": "git commit -m x"}, "scout")


def test_guard_worker_writes_only_under_build_and_kitchen(env):
    b = env.home / "antigravity" / "build"
    assert g(env, "Write", {"file_path": str(b / "repo" / "a.md"), "content": "x"}, "worker")
    assert g(env, "Edit", {"file_path": str(env.kitchen / "orders" / "n.md")}, "worker")
    assert not g(env, "Write", {"file_path": str(env.home / "Desktop" / "a.md"), "content": "x"}, "worker")
    assert not g(env, "Write", {"file_path": "C:\\Windows\\a.md", "content": "x"}, "worker")
    assert not g(env, "Bash", {"command": "Set-Content C:\\Windows\\x.txt hi"}, "worker")


def test_guard_denies_unknown_tools(env):
    assert not g(env, "SomethingNew", {}, "worker")


def test_guard_is_wired_into_sdk(env, monkeypatch):
    fake = install(monkeypatch, FakeSDK())
    assert run(env, "--mode", "scout") == 0
    opts = fake.calls[0]
    assert opts.can_use_tool is not None
    assert "PreToolUse" in opts.hooks
    deny = asyncio.run(opts.can_use_tool("Bash", {"command": "rm -rf x"}, None))
    assert deny.behavior == "deny"
    hook = opts.hooks["PreToolUse"][0].hooks[0]
    out = asyncio.run(hook({"tool_name": "Bash", "tool_input": {"command": "git push origin main"}}, "id1", None))
    assert out["hookSpecificOutput"]["permissionDecision"] == "deny"
    ok = asyncio.run(hook({"tool_name": "Bash", "tool_input": {"command": "git status"}}, "id2", None))
    assert ok.get("hookSpecificOutput", {}).get("permissionDecision") != "deny"

"""Worker usability and launcher checks. The launcher tests never reach the SDK: one has no key, one has a missing order."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
FAKE = "FAKE-CONSOLE-VALUE-FOR-TESTS-ONLY"


@pytest.fixture
def cfg(tmp_path, monkeypatch):
    monkeypatch.setenv("USERPROFILE", str(tmp_path / "home"))
    import assistant
    return assistant, assistant.load_config(None)


@pytest.mark.parametrize("cmd", [
    "git add ops/a.py", 'git commit -m "add guard"', "python -m pytest -q", "npm test",
    "git checkout -b feat/y", "git log --oneline -5", "git status", "git push -u origin feat/y",
])
def test_worker_can_do_ordinary_work(cfg, cmd):
    a, c = cfg
    assert a.guard("Bash", {"command": cmd}, "worker", c)[0], cmd


def test_parent_never_gets_anthropic_variable_from_module(cfg):
    a, c = cfg
    assert "ANTHROPIC_API_KEY" not in os.environ
    src = (HERE / "assistant.py").read_text(encoding="utf-8")
    assert "os.environ[\"ANTHROPIC_API_KEY\"]" not in src and "setx" not in src.lower()
    assert "SetEnvironmentVariable" not in src


def test_launcher_has_no_user_folder_and_no_machine_scope():
    src = (HERE / "run-assistant.ps1").read_text(encoding="utf-8")
    assert "$env:USERPROFILE" in src
    assert "C:\\Users\\" not in src
    assert "SetEnvironmentVariable" not in src and "setx" not in src.lower()
    assert "CreateNoWindow = $true" in src


PS = shutil.which("powershell") or shutil.which("pwsh")


def _launch(tmp_path, env_text, order):
    home = tmp_path / "home"
    home.mkdir(exist_ok=True)
    envfile = tmp_path / "fake-node.env"
    envfile.write_text(env_text, encoding="utf-8")
    env = dict(os.environ, USERPROFILE=str(home))
    env.pop("CLAUDE_CONSOLE_KEY", None)
    env.pop("ANTHROPIC_API_KEY", None)
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    p = subprocess.run([PS, "-NoProfile", "-NonInteractive", "-File", str(HERE / "run-assistant.ps1"),
                        "-Order", order, "-Name", "launchtest", "-EnvFile", str(envfile)],
                       env=env, capture_output=True, text=True, timeout=120, creationflags=flags)
    texts = [f.read_text(encoding="utf-8-sig", errors="replace") for f in home.rglob("*") if f.is_file()]
    return p, texts, home


@pytest.mark.skipif(PS is None or os.name != "nt", reason="Windows PowerShell launcher")
def test_launcher_without_value_exits_2(tmp_path):
    p, texts, home = _launch(tmp_path, "OTHER_SETTING=1\n", str(tmp_path / "none.md"))
    if "running scripts is disabled" in (p.stdout + p.stderr):
        pytest.skip("execution policy blocks local scripts here")
    assert p.returncode == 2, p.stdout + p.stderr
    logs = list((home / "antigravity" / ".fable-kitchen" / "orders").glob("launchtest-*.log"))
    assert len(logs) == 1
    body = logs[0].read_text(encoding="utf-8-sig")
    assert " start launchtest " in body and " exit launchtest code 2" in body and "CLAUDE_CONSOLE_KEY" in body


@pytest.mark.skipif(PS is None or os.name != "nt", reason="Windows PowerShell launcher")
def test_launcher_passes_value_to_child_without_writing_it(tmp_path):
    p, texts, home = _launch(tmp_path, f"OTHER_SETTING=1\nCLAUDE_CONSOLE_KEY=\"{FAKE}\"\n", str(tmp_path / "none.md"))
    if "running scripts is disabled" in (p.stdout + p.stderr):
        pytest.skip("execution policy blocks local scripts here")
    # Value reached the child (no exit 2); the order is missing so it stops before any SDK call.
    assert p.returncode == 1, p.stdout + p.stderr
    assert texts
    for t in texts:
        assert FAKE not in t
    assert FAKE not in p.stdout + p.stderr

"""Tests for get_newroz_home() profile-mode fallback warning.

Regression test for https://github.com/newroz-agent/newroz-agent/issues/18594.

When NEWROZ_HOME is unset but an active_profile file indicates a non-default
profile is active, get_newroz_home() should:
  1. STILL return ~/.newroz (raising would brick 30+ module-level callers)
  2. Emit a loud one-shot warning to stderr so operators can diagnose
     cross-profile data contamination after the fact.

The warning goes to stderr directly (not through logging) because this
function is called at module-import time from 30+ sites, often before the
logging subsystem has been configured.
"""

from pathlib import Path

import pytest


@pytest.fixture
def fresh_constants(monkeypatch, tmp_path):
    """Import newroz_constants fresh and reset the one-shot warn flag."""
    import importlib
    import newroz_constants
    importlib.reload(newroz_constants)
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    monkeypatch.delenv("NEWROZ_HOME", raising=False)
    return newroz_constants


class TestGetNewrozHomeProfileWarning:
    def test_classic_mode_no_active_profile_no_warning(
        self, fresh_constants, tmp_path, capsys
    ):
        """Classic mode: no active_profile file → silent, returns ~/.newroz."""
        result = fresh_constants.get_newroz_home()
        assert result == tmp_path / ".newroz"
        assert "NEWROZ_HOME fallback" not in capsys.readouterr().err

    def test_default_active_profile_no_warning(
        self, fresh_constants, tmp_path, capsys
    ):
        """active_profile=default → still no warning, returns ~/.newroz."""
        newroz_dir = tmp_path / ".newroz"
        newroz_dir.mkdir()
        (newroz_dir / "active_profile").write_text("default\n")
        result = fresh_constants.get_newroz_home()
        assert result == tmp_path / ".newroz"
        assert "NEWROZ_HOME fallback" not in capsys.readouterr().err

    def test_named_profile_unset_home_warns_once(
        self, fresh_constants, tmp_path, capsys
    ):
        """active_profile=coder + NEWROZ_HOME unset → warn loudly, still return fallback."""
        newroz_dir = tmp_path / ".newroz"
        newroz_dir.mkdir()
        (newroz_dir / "active_profile").write_text("coder\n")

        result = fresh_constants.get_newroz_home()

        # 1. Still returns the fallback — no import-time crash
        assert result == tmp_path / ".newroz"
        # 2. Stderr got the warning exactly once
        err = capsys.readouterr().err
        assert err.count("NEWROZ_HOME fallback") == 1
        assert "'coder'" in err
        assert "#18594" in err

        # 3. One-shot: second and third calls don't re-warn
        fresh_constants.get_newroz_home()
        fresh_constants.get_newroz_home()
        err2 = capsys.readouterr().err
        assert "NEWROZ_HOME fallback" not in err2

    def test_newroz_home_set_suppresses_warning(
        self, fresh_constants, tmp_path, capsys, monkeypatch
    ):
        """Even if active_profile is 'coder', setting NEWROZ_HOME suppresses warning."""
        profile_dir = tmp_path / ".newroz" / "profiles" / "coder"
        profile_dir.mkdir(parents=True)
        (tmp_path / ".newroz" / "active_profile").write_text("coder\n")
        monkeypatch.setenv("NEWROZ_HOME", str(profile_dir))

        result = fresh_constants.get_newroz_home()

        assert result == profile_dir
        assert "NEWROZ_HOME fallback" not in capsys.readouterr().err

    def test_unreadable_active_profile_no_crash(
        self, fresh_constants, tmp_path, capsys
    ):
        """active_profile that can't be decoded → fall through silently."""
        newroz_dir = tmp_path / ".newroz"
        newroz_dir.mkdir()
        # Write bytes that aren't valid utf-8
        (newroz_dir / "active_profile").write_bytes(b"\xff\xfe\x00\x00")

        result = fresh_constants.get_newroz_home()

        assert result == tmp_path / ".newroz"
        # Shouldn't crash; shouldn't warn either (can't tell what profile was intended)
        assert "NEWROZ_HOME fallback" not in capsys.readouterr().err

    def test_empty_active_profile_no_warning(
        self, fresh_constants, tmp_path, capsys
    ):
        """Empty active_profile file → treated as default, no warning."""
        newroz_dir = tmp_path / ".newroz"
        newroz_dir.mkdir()
        (newroz_dir / "active_profile").write_text("")

        result = fresh_constants.get_newroz_home()

        assert result == tmp_path / ".newroz"
        assert "NEWROZ_HOME fallback" not in capsys.readouterr().err

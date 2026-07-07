"""Resolve NEWROZ_HOME for standalone skill scripts.

Skill scripts may run outside the Newroz process (e.g. system Python,
nix env, CI) where ``newroz_constants`` is not importable.  This module
provides the same ``get_newroz_home()`` and ``display_newroz_home()``
contracts as ``newroz_constants`` without requiring it on ``sys.path``.

When ``newroz_constants`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``newroz_constants.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``NEWROZ_HOME = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from newroz_constants import display_newroz_home as display_newroz_home
    from newroz_constants import get_newroz_home as get_newroz_home
except (ModuleNotFoundError, ImportError):

    def get_newroz_home() -> Path:
        """Return the Newroz home directory (default: ~/.newroz).

        Mirrors ``newroz_constants.get_newroz_home()``."""
        val = os.environ.get("NEWROZ_HOME", "").strip()
        return Path(val) if val else Path.home() / ".newroz"

    def display_newroz_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``newroz_constants.display_newroz_home()``."""
        home = get_newroz_home()
        try:
            return "~/" + str(home.relative_to(Path.home()))
        except ValueError:
            return str(home)

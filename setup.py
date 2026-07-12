from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import tempfile

from setuptools import setup
from setuptools.command.build import build as _build
from setuptools.command.egg_info import egg_info as _egg_info


REPO_ROOT = Path(__file__).parent.resolve()


def _source_tree_is_writable() -> bool:
    probe = REPO_ROOT / ".setuptools-write-probe"
    try:
        with probe.open("w", encoding="utf-8") as handle:
            handle.write("")
        probe.unlink()
    except OSError:
        try:
            probe.unlink(missing_ok=True)
        except OSError:
            pass
        return False
    return True


def _temporary_build_dir(kind: str) -> str:
    return tempfile.mkdtemp(prefix=f"newroz-agent-{kind}-")


def _would_write_under_source(path_value: str | None) -> bool:
    if path_value is None:
        return True
    path = Path(path_value)
    if not path.is_absolute():
        path = REPO_ROOT / path
    try:
        path.resolve().relative_to(REPO_ROOT)
    except ValueError:
        return False
    return True


class ReadOnlySourceBuild(_build):
    def finalize_options(self) -> None:
        if (
            not _source_tree_is_writable()
            and _would_write_under_source(self.build_base)
        ):
            self.build_base = _temporary_build_dir("build")
        super().finalize_options()


class ReadOnlySourceEggInfo(_egg_info):
    def finalize_options(self) -> None:
        if (
            not _source_tree_is_writable()
            and _would_write_under_source(self.egg_base)
        ):
            self.egg_base = _temporary_build_dir("egg-info")
        super().finalize_options()


def _data_file_tree(root_name: str, pattern: str = "*") -> list[tuple[str, list[str]]]:
    root = REPO_ROOT / root_name
    grouped: defaultdict[str, list[str]] = defaultdict(list)
    for path in sorted(root.rglob(pattern)):
        if not path.is_file():
            continue
        if "__pycache__" in path.parts or path.suffix in {".pyc", ".pyo"}:
            continue
        rel_path = path.relative_to(REPO_ROOT)
        grouped[str(rel_path.parent)].append(str(rel_path))
    return sorted(grouped.items())


# EVERY data_files entry must be declared here, not in pyproject.toml.
# `[tool.setuptools.data-files]` in pyproject silently OVERRIDES this kwarg
# rather than merging with it: when locales/ and optional-mcps/ were declared
# there, setuptools dropped skills/ and optional-skills/ from the wheel
# entirely. The sdist still carried them (MANIFEST.in grafts them), so the
# breakage only showed up for `pip install newroz-agent`, which takes the
# wheel — bundled skills silently vanished, and get_bundled_skills_dir()
# (newroz_constants.py) fell through its `<sysconfig data>/skills` branch to
# an empty ~/.newroz/skills.
#
# These are bare data directories with no __init__.py, so they are neither
# packages (packages.find) nor package-data (which attaches to a package);
# data_files is the only mechanism that ships them to a sealed install.
setup(
    cmdclass={
        "build": ReadOnlySourceBuild,
        "egg_info": ReadOnlySourceEggInfo,
    },
    data_files=[
        *_data_file_tree("skills"),
        *_data_file_tree("optional-skills"),
        *_data_file_tree("locales", "*.yaml"),
        *_data_file_tree("optional-mcps", "manifest.yaml"),
    ]
)

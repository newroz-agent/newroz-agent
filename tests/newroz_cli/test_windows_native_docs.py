from pathlib import Path


def test_windows_native_install_path_docs_match_installer() -> None:
    doc = Path("website/docs/user-guide/windows-native.md").read_text()
    install = Path("scripts/install.ps1").read_text()

    assert "%LOCALAPPDATA%\\newroz\\newroz-agent\\venv\\Scripts" in doc
    assert "Get-Command newroz        # should print C:\\Users\\<you>\\AppData\\Local\\newroz\\newroz-agent\\venv\\Scripts\\newroz.exe" in doc
    assert '$newrozBin = "$InstallDir\\venv\\Scripts"' in install

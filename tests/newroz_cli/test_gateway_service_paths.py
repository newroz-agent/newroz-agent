from unittest.mock import patch


def test_service_path_skips_nonexistent_node_modules(tmp_path):
    """Service PATH should not include node_modules/.bin if it doesn't exist."""
    from newroz_cli.gateway import _build_service_path_dirs
    with patch("newroz_cli.gateway.get_newroz_home", return_value=tmp_path / ".newroz"):
        dirs = _build_service_path_dirs(project_root=tmp_path)
    node_modules_bin = str(tmp_path / "node_modules" / ".bin")
    assert node_modules_bin not in dirs


def test_service_path_includes_node_modules_when_present(tmp_path):
    """Service PATH should include node_modules/.bin when it exists."""
    nm_bin = tmp_path / "node_modules" / ".bin"
    nm_bin.mkdir(parents=True)
    from newroz_cli.gateway import _build_service_path_dirs
    with patch("newroz_cli.gateway.get_newroz_home", return_value=tmp_path / ".newroz"):
        dirs = _build_service_path_dirs(project_root=tmp_path)
    assert str(nm_bin) in dirs


def test_service_path_includes_newroz_home_node_modules(tmp_path):
    """Service PATH should include ~/.newroz/node_modules/.bin when it exists."""
    newroz_nm = tmp_path / ".newroz" / "node_modules" / ".bin"
    newroz_nm.mkdir(parents=True)
    from newroz_cli.gateway import _build_service_path_dirs
    with patch("newroz_cli.gateway.get_newroz_home", return_value=tmp_path / ".newroz"):
        dirs = _build_service_path_dirs(project_root=tmp_path)
    assert str(newroz_nm) in dirs

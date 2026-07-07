class NewrozAgent < Formula
  include Language::Python::Virtualenv

  desc "Self-improving AI agent that creates skills from experience"
  homepage "https://github.com/newroz-agent/newroz-agent"
  # Stable source should point at the semver-named sdist asset attached by
  # scripts/release.py, not the CalVer tag tarball.
  url "https://github.com/newroz-agent/newroz-agent/releases/download/v2026.3.30/newroz_agent-0.6.0.tar.gz"
  sha256 "<replace-with-release-asset-sha256>"
  license "MIT"

  depends_on "certifi" => :no_linkage
  depends_on "cryptography" => :no_linkage
  depends_on "libyaml"
  depends_on "python@3.14"

  pypi_packages ignore_packages: %w[certifi cryptography pydantic]

  # Refresh resource stanzas after bumping the source url/version:
  #   brew update-python-resources --print-only newroz-agent

  def install
    venv = virtualenv_create(libexec, "python3.14")
    venv.pip_install resources
    venv.pip_install buildpath

    pkgshare.install "skills", "optional-skills"

    %w[newroz newroz-agent newroz-acp].each do |exe|
      next unless (libexec/"bin"/exe).exist?

      (bin/exe).write_env_script(
        libexec/"bin"/exe,
        NEWROZ_BUNDLED_SKILLS: pkgshare/"skills",
        NEWROZ_OPTIONAL_SKILLS: pkgshare/"optional-skills",
        NEWROZ_MANAGED: "homebrew"
      )
    end
  end

  test do
    assert_match "Newroz Agent v#{version}", shell_output("#{bin}/newroz version")

    managed = shell_output("#{bin}/newroz update 2>&1")
    assert_match "managed by Homebrew", managed
    assert_match "brew upgrade newroz-agent", managed
  end
end

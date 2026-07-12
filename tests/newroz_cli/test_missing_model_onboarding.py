"""First-run onboarding when a provider resolves but no model was ever chosen.

Regression tests for the fresh-install trap: `model.default` starts as "" (see
DEFAULT_CONFIG in cli.py), so a config.yaml carrying a `model:` block with no
`default:` key sends a request with an empty `model` field. The provider rejects
it with something unactionable — OpenRouter answers `HTTP 400: No models
provided` — which tells a new user nothing about what to fix.

The critical distinction these tests pin down: "credentials found but no model"
and "nothing configured at all" are DIFFERENT states and must not be conflated.
Claiming credentials exist when none do would be flatly untrue.
"""

import pytest

from newroz_cli.runtime_provider import (
    format_missing_model_error,
    resolved_model_is_empty,
)


class TestResolvedModelIsEmpty:
    @pytest.mark.parametrize("value", [None, "", "   ", "\t\n"])
    def test_blank_values_are_empty(self, value):
        assert resolved_model_is_empty(value) is True

    @pytest.mark.parametrize("value", ["z-ai/glm-5.2", "  gpt-5  ", "@cf/zai-org/glm-5.2"])
    def test_real_model_ids_are_not_empty(self, value):
        assert resolved_model_is_empty(value) is False


class TestFormatMissingModelError:
    def test_names_the_provider_that_resolved(self):
        msg = format_missing_model_error("openrouter")
        assert "openrouter" in msg

    def test_points_at_both_remedies(self):
        msg = format_missing_model_error("openrouter")
        # The interactive picker and the direct config write — a user who cannot
        # run a TUI (CI, container, piped stdin) still needs a way forward.
        assert "newroz model" in msg
        assert "newroz config set model.default" in msg

    def test_falls_back_to_generic_label_when_provider_unknown(self):
        msg = format_missing_model_error(None)
        assert "your provider" in msg

    def test_does_not_leak_the_raw_provider_error(self):
        # The whole point is to replace "HTTP 400: No models provided".
        msg = format_missing_model_error("openrouter")
        assert "400" not in msg
        assert "No models provided" not in msg

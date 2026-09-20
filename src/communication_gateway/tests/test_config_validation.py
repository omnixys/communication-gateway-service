from __future__ import annotations

import pytest

import communication_gateway.config as config_module
from communication_gateway.config import validate_production_settings


class _StubCore:
    log_level: str = "INFO"
    chat_service_url: str = ""
    notification_service_url: str = ""
    internal_api_key: str = ""
    chat_service_api_key: str = ""
    notification_service_api_key: str = ""


class _StubEvolution:
    base_url: str = ""
    api_key: str = ""
    webhook_secret: str = ""


class _StubSettings:
    core: _StubCore = _StubCore()
    evolution: _StubEvolution = _StubEvolution()
    email_primary: str = "none"
    email_fallback: str = "none"


def _force_empty_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config_module, "settings", _StubSettings())


def test_missing_environment_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    with pytest.raises(RuntimeError, match="Missing required env: ENVIRONMENT"):
        validate_production_settings()


def test_development_and_staging_enforce_required_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _force_empty_settings(monkeypatch)
    for environment in ("development", "staging"):
        monkeypatch.setenv("ENVIRONMENT", environment)
        with pytest.raises(RuntimeError, match="Missing required production settings"):
            validate_production_settings()


def test_log_level_test_bypasses_enforcement(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _StubSettings()
    settings.core.log_level = "TEST"
    monkeypatch.setattr(config_module, "settings", settings)
    monkeypatch.setenv("ENVIRONMENT", "development")
    validate_production_settings()


def test_other_environments_skip_required_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _force_empty_settings(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "test")
    validate_production_settings()

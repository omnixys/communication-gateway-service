from __future__ import annotations

from typing import TYPE_CHECKING

from communication_gateway.config import (
    EvolutionSettings,
    GatewaySettings,
)

if TYPE_CHECKING:
    import pytest


class TestConfig:
    def test_evolution_settings_defaults(self, monkeypatch: pytest.MonkeyPatch) -> None:
        for key in (
            "EVOLUTION_BASE_URL",
            "EVOLUTION_API_KEY",
            "EVOLUTION_INSTANCE_NAME",
            "EVOLUTION_WEBHOOK_SECRET",
            "EVOLUTION_CORS_ORIGIN",
        ):
            monkeypatch.delenv(key, raising=False)
        s = EvolutionSettings()
        assert s.base_url
        assert s.api_key == ""
        assert s.instance_name
        assert s.cors_origin == ""

    def test_settings_defaults(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("config.settings.load_dotenv", lambda *_a, **_kw: None)
        monkeypatch.setenv("PORT", "8002")
        s = GatewaySettings()
        assert s.core.host == "0.0.0.0"
        assert s.core.port == 8002
        assert s.database.url.startswith("postgresql")

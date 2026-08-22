from __future__ import annotations

from typing import TYPE_CHECKING

from communication_gateway.config import (
    EvolutionSettings,
    GatewaySettings,
    StalwartSettings,
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

    def test_stalwart_oauthbearer_settings(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("STALWART_AUTH_MODE", "oauthbearer")
        monkeypatch.setenv("STALWART_OAUTH_TOKEN_URL", "https://keycloak.example/token")
        monkeypatch.setenv("STALWART_OAUTH_CLIENT_ID", "communication-gateway-mail")
        monkeypatch.setenv("STALWART_OAUTH_CLIENT_SECRET", "secret")

        s = StalwartSettings()

        assert s.auth_mode == "oauthbearer"
        assert s.oauth_token_url == "https://keycloak.example/token"
        assert s.oauth_client_id == "communication-gateway-mail"
        assert s.oauth_client_secret == "secret"

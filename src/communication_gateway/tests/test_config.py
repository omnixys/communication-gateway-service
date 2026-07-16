from communication_gateway.config import (
    EvolutionSettings,
    GatewaySettings,
)


class TestConfig:
    def test_evolution_settings_defaults(self) -> None:
        s = EvolutionSettings()
        assert s.base_url
        assert s.api_key == ""
        assert s.instance_name

    def test_settings_defaults(self) -> None:
        s = GatewaySettings()
        assert s.core.host == "0.0.0.0"
        assert s.core.port == 8002
        assert s.database.url.startswith("postgresql")

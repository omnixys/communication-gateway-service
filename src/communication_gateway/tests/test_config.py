from communication_gateway.config import (
    EvolutionSettings,
    Settings,
)


class TestConfig:

    def test_evolution_settings_defaults(self) -> None:
        s = EvolutionSettings()
        assert s.base_url == "http://localhost:8080"
        assert s.api_key == ""
        assert s.instance_name == "omnixys"

    def test_settings_defaults(self) -> None:
        s = Settings()
        assert s.host == "0.0.0.0"
        assert s.port == 8002
        assert s.database_url.startswith("postgresql")

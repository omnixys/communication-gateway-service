from communication_gateway.tests.conftest import MockProvider


class TestHealth:
    async def test_mock_provider_healthy(self, mock_provider: MockProvider) -> None:
        ok = await mock_provider.health()
        assert ok is True

    async def test_mock_provider_unhealthy(self, mock_provider: MockProvider) -> None:
        mock_provider.health_result = False
        ok = await mock_provider.health()
        assert ok is False

    async def test_mock_provider_capabilities(self, mock_provider: MockProvider) -> None:
        caps = await mock_provider.capabilities()
        assert caps.supports_attachments is True

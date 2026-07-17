import errno
from typing import TYPE_CHECKING

import pytest
from httpx import ASGITransport, AsyncClient

from communication_gateway.config import settings
from communication_gateway.main import app, ensure_bind_available

if TYPE_CHECKING:
    from _pytest.monkeypatch import MonkeyPatch


async def test_federation_endpoint_requires_internal_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings.core, "internal_api_key", "shared-secret")
    transport = ASGITransport(app=app)
    query = {"query": "{ _service { sdl } }"}
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        missing = await client.post("/graphql", json=query)
        wrong = await client.post(
            "/graphql", json=query, headers={"x-internal-api-key": "wrong"},
        )
        accepted = await client.post(
            "/graphql", json=query, headers={"x-internal-api-key": "shared-secret"},
        )
    assert missing.status_code == 401
    assert wrong.status_code == 401
    assert accepted.status_code == 200
    assert "type Query" in accepted.json()["data"]["_service"]["sdl"]


class FakeSocket:
    def __init__(self, error: OSError | None = None) -> None:
        self.error = error
        self.closed = False

    def bind(self, _address: tuple[str, int]) -> None:
        if self.error is not None:
            raise self.error

    def close(self) -> None:
        self.closed = True


def test_occupied_port_has_actionable_error(monkeypatch: MonkeyPatch) -> None:
    probe = FakeSocket(OSError(errno.EADDRINUSE, "occupied"))
    monkeypatch.setattr("communication_gateway.main.socket.socket", lambda *_args: probe)
    with pytest.raises(SystemExit, match="already in use"):
        ensure_bind_available("127.0.0.1", 8002)
    assert probe.closed is True

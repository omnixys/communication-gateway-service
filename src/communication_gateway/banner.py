from __future__ import annotations

import getpass
import platform
from typing import TYPE_CHECKING
from urllib.parse import urlparse

if TYPE_CHECKING:
    from communication_gateway.config import GatewaySettings


_GREEN = "\033[32m"
_CYAN = "\033[36m"
_YELLOW = "\033[33m"
_RED = "\033[31m"
_RESET = "\033[0m"


def _mask_url(url: str, *, production: bool = True) -> str:
    if not production:
        return url
    try:
        parsed = urlparse(url)
        if parsed.password:
            return url.replace(parsed.password, "****")
    except Exception:
        pass
    return url


def _info(label: str, value: str) -> None:
    print(f"  {_CYAN}{label}:{_RESET} {_YELLOW}{value}{_RESET}")  # noqa: T201


def _info_colored(label: str, value: str, color: str) -> None:
    print(f"  {_CYAN}{label}:{_RESET} {color}{value}{_RESET}")  # noqa: T201


def _section(title: str) -> None:
    width = 51
    inner = width - 2
    padding = inner - len(title)
    left = padding // 2
    right = padding - left
    print(f"{_GREEN}{'=' * left}{title}{'=' * right}{_RESET}")  # noqa: T201


def print_banner(settings: GatewaySettings) -> None:
    name = settings.core.service_name.upper()
    is_production = settings.core.is_production

    banner = f"""
{_GREEN}  ╔══════════════════════════════════════════════════╗
  ║{_CYAN}{name:^48}{_GREEN}  ║
  ║{_YELLOW}{'Omnixys Technologies':^48}{_GREEN}  ║
  ╚══════════════════════════════════════════════════╝{_RESET}"""
    print(banner)  # noqa: T201

    _section("ANWENDUNGSINFORMATIONEN")
    _info("Anwendungsname", name)
    _info("Python-Version", platform.python_version())

    env = settings.core.environment.lower()
    if env in ("local", "development"):
        env_color = _GREEN
    elif env == "staging":
        env_color = _YELLOW
    elif env == "production":
        env_color = _RED
    else:
        env_color = _YELLOW
    _info_colored("Umgebung", settings.core.environment, env_color)
    _info("Host", settings.core.host)
    _info("Port", str(settings.core.port))
    _info("Betriebssystem", f"{platform.system()} ({platform.release()})")
    _info("Benutzer", getpass.getuser())
    _info("Hot Reload", "AKTIVIERT" if settings.hot_reload else "DEAKTIVIERT")

    _section("LOGGER")
    _info("Log Level", settings.core.log_level)

    _section("KEYCLOAK")
    _info("URL", settings.keycloak.url)
    _info("Realm", settings.keycloak.realm)
    _info("Client", settings.keycloak.client_id)
    _info("Audience", settings.keycloak.audience)

    _section("DATABASE")
    _info("URL", _mask_url(settings.database.url, production=is_production))
    _info("Pool Size", str(settings.database.pool_size))
    _info("Max Overflow", str(settings.database.max_overflow))
    _info("Echo", "AKTIVIERT" if settings.database.echo else "DEAKTIVIERT")

    _section("SECURITY")
    _info("CORS Origins", ", ".join(settings.security.cors_allowed_origins) or "—")
    if settings.security.rate_limit.enabled:
        _info("Rate Limit", f"{settings.security.rate_limit.default_limit}/min")
    else:
        _info("Rate Limit", "DEAKTIVIERT")
    _info("Cookie Secure", str(settings.security.cookie_secure))

    _section("KAFKA")
    _info("Bootstrap Servers", settings.kafka.bootstrap_servers)
    _info("Client ID", settings.kafka.client_id)
    _info("Group ID", settings.kafka.group_id)
    _info("ACKs", settings.kafka.acks)
    _info("DLQ", "AKTIVIERT" if settings.kafka.dlq_enabled else "DEAKTIVIERT")

    _section("VALKEY")
    _info("URL", _mask_url(settings.cache.url, production=is_production))
    _info("Key Prefix", settings.cache.key_prefix)
    _info("Invalidierung", "AKTIVIERT" if settings.cache.invalidation_enabled else "DEAKTIVIERT")

    _section("OBSERVABILITY")
    _info("OTLP Endpoint", settings.observability.otlp_endpoint)
    _info("Tracing", "AKTIVIERT" if settings.observability.tracing_enabled else "DEAKTIVIERT")
    _info("Metrics", "AKTIVIERT" if settings.observability.metrics_enabled else "DEAKTIVIERT")
    _info("Sampling", str(settings.observability.sampling_probability))

    _section("STORAGE")
    _info("Endpoint", settings.storage.endpoint)
    _info("Bucket", settings.storage.bucket)
    _info("Region", settings.storage.region)

    _section("CHAT SERVICE")
    _info("URL", settings.core.chat_service_url)

    print(f"{_GREEN}{'=' * 51}{_RESET}\n")  # noqa: T201

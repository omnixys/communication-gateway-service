from pathlib import Path
from typing import Literal
from uuid import UUID  # noqa: TC003 - Pydantic resolves this annotation at runtime.

from config.settings import AppSettings, CoreSettings
from pydantic import BaseModel, ConfigDict, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_GATEWAY_PKG_DIR = Path(__file__).resolve().parent.parent.parent


class GatewayCoreSettings(CoreSettings):
    internal_api_key: str = ""
    chat_service_url: str = "http://localhost:8001"
    chat_service_api_key: str = ""
    notification_service_url: str = "http://localhost:7402"
    notification_service_api_key: str = ""
    address_mappings: str = "{}"


class EvolutionSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="evolution_")

    base_url: str = "http://localhost:8080"
    api_key: str = ""
    instance_name: str = "omnixys"
    webhook_secret: str = ""
    cors_origin: str = ""


class WhatsAppSupportRoute(BaseModel):
    """Trusted deployment-time route for one Evolution instance."""

    model_config = ConfigDict(populate_by_name=True)

    tenant_id: UUID = Field(alias="tenantId")
    event_id: UUID = Field(alias="eventId")


class WhatsAppSupportSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="whatsapp_support_")

    event_map: dict[str, WhatsAppSupportRoute] = Field(default_factory=dict)


class SMTPSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="smtp_")

    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_address: str = ""


class TwilioSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="twilio_")

    account_sid: str = ""
    auth_token: str = ""
    from_number: str = ""


class MailuSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="mailu_")

    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""


class FirebaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="firebase_")

    credentials_path: str = ""


class WhatsAppCloudSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="whatsapp_cloud_")

    token: str = ""
    phone_number_id: str = ""
    verify_token: str = ""


class SignalSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="signal_")

    url: str = "http://localhost:8080"


class TelegramSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="telegram_")

    bot_token: str = ""


class StalwartSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="stalwart_")

    enabled: bool = False
    priority: int = 10
    timeout: int = 30
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    auth_mode: Literal["password", "oauthbearer"] = "password"
    oauth_token_url: str = ""
    oauth_client_id: str = ""
    oauth_client_secret: str = ""
    from_address: str = ""
    tls_enabled: bool = True
    tls_verify: bool = True


class ResendSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_GATEWAY_PKG_DIR / ".env"),
        env_file_encoding="utf-8",
        env_prefix="resend_",
        extra="ignore",
    )

    api_key: str = ""
    from_address: str = ""
    base_url: str = "https://api.resend.com"
    timeout: int = 30


class GatewayKafkaSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="kafka_")

    broker: str = ""
    topic_delivery_status: str = "gateway.delivery.status"


class GatewaySettings(AppSettings):
    model_config = SettingsConfigDict(
        env_file=str(_GATEWAY_PKG_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    core: GatewayCoreSettings = GatewayCoreSettings()

    evolution: EvolutionSettings = EvolutionSettings()
    whatsapp_support: WhatsAppSupportSettings = WhatsAppSupportSettings()
    smtp: SMTPSettings = SMTPSettings()
    twilio: TwilioSettings = TwilioSettings()
    mailu: MailuSettings = MailuSettings()
    firebase: FirebaseSettings = FirebaseSettings()
    whatsapp_cloud: WhatsAppCloudSettings = WhatsAppCloudSettings()
    signal: SignalSettings = SignalSettings()
    telegram: TelegramSettings = TelegramSettings()
    stalwart: StalwartSettings = StalwartSettings()
    resend: ResendSettings = ResendSettings()
    gateway_kafka: GatewayKafkaSettings = GatewayKafkaSettings()

    email_primary: str = "resend"
    email_fallback: str = "none"


settings = GatewaySettings()


def validate_production_settings() -> None:
    if settings.core.log_level.upper() == "TEST":
        return
    import os

    environment = os.getenv("ENVIRONMENT")
    if not environment:
        msg = "Missing required env: ENVIRONMENT"
        raise RuntimeError(msg)
    if environment.lower() not in {"production", "development", "staging"}:
        return
    required = {
        "CHAT_SERVICE_URL": settings.core.chat_service_url,
        "NOTIFICATION_SERVICE_URL": settings.core.notification_service_url,
        "INTERNAL_API_KEY": settings.core.internal_api_key,
        "CHAT_SERVICE_API_KEY": settings.core.chat_service_api_key,
        "NOTIFICATION_SERVICE_API_KEY": settings.core.notification_service_api_key,
        "EVOLUTION_BASE_URL": settings.evolution.base_url,
        "EVOLUTION_WEBHOOK_SECRET": settings.evolution.webhook_secret,
        "EVOLUTION_API_KEY": settings.evolution.api_key,
    }
    if settings.email_primary == "resend" or settings.email_fallback == "resend":
        required.update(
            {
                "RESEND_API_KEY": settings.resend.api_key,
                "RESEND_FROM_ADDRESS": settings.resend.from_address,
            },
        )
    if settings.email_primary == "stalwart" or settings.email_fallback == "stalwart":
        required.update(
            {
                "STALWART_HOST": settings.stalwart.host,
                "STALWART_USERNAME": settings.stalwart.username,
                "STALWART_PASSWORD": settings.stalwart.password,
            },
        )
        if settings.stalwart.auth_mode == "oauthbearer":
            required.update(
                {
                    "STALWART_OAUTH_TOKEN_URL": settings.stalwart.oauth_token_url,
                    "STALWART_OAUTH_CLIENT_ID": settings.stalwart.oauth_client_id,
                    "STALWART_OAUTH_CLIENT_SECRET": settings.stalwart.oauth_client_secret,
                },
            )
    missing = [name for name, value in required.items() if not value]
    if missing:
        import logging

        logging.getLogger(__name__).error("missing_production_settings %s", missing)
        msg = f"Missing required production settings: {', '.join(missing)}"
        raise RuntimeError(msg)

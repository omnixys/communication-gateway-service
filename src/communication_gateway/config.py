from pydantic_settings import BaseSettings, SettingsConfigDict

from omnixys_config.settings import AppSettings, CoreSettings


class GatewayCoreSettings(CoreSettings):
    internal_api_key: str = ""
    chat_service_url: str = "http://localhost:8001"
    chat_service_api_key: str = ""
    address_mappings: str = "{}"


class EvolutionSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="evolution_")

    base_url: str = "http://localhost:8080"
    api_key: str = ""
    instance_name: str = "omnixys"
    webhook_secret: str = ""


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
    from_address: str = ""
    tls_enabled: bool = True
    tls_verify: bool = True


class ResendSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", env_prefix="resend_", extra="ignore")

    api_key: str = ""
    from_address: str = ""
    base_url: str = "https://api.resend.com"
    timeout: int = 30


class GatewayKafkaSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="kafka_")

    broker: str = ""
    topic_delivery_status: str = "gateway.delivery.status"


class GatewaySettings(AppSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    core: GatewayCoreSettings = GatewayCoreSettings()

    evolution: EvolutionSettings = EvolutionSettings()
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


settings = GatewaySettings()


def validate_production_settings() -> None:
    if settings.core.log_level.upper() == "TEST":
        return
    import os

    if os.getenv("ENVIRONMENT", "development").lower() != "production":
        return
    required = {
        "INTERNAL_API_KEY": settings.core.internal_api_key,
        "CHAT_SERVICE_API_KEY": settings.core.chat_service_api_key,
        "EVOLUTION_API_KEY": settings.evolution.api_key,
        "RESEND_API_KEY": settings.resend.api_key,
        "RESEND_FROM_ADDRESS": settings.resend.from_address,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError(f"Missing required production settings: {', '.join(missing)}")

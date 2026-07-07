from pydantic_settings import BaseSettings


class EvolutionSettings(BaseSettings):
    model_config = {"env_prefix": "evolution_"}

    base_url: str = "http://localhost:8080"
    api_key: str = ""
    instance_name: str = "omnixys"
    webhook_secret: str = ""


class SMTPSettings(BaseSettings):
    model_config = {"env_prefix": "smtp_"}

    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_address: str = ""


class TwilioSettings(BaseSettings):
    model_config = {"env_prefix": "twilio_"}

    account_sid: str = ""
    auth_token: str = ""
    from_number: str = ""


class MailuSettings(BaseSettings):
    model_config = {"env_prefix": "mailu_"}

    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""


class FirebaseSettings(BaseSettings):
    model_config = {"env_prefix": "firebase_"}

    credentials_path: str = ""


class WhatsAppCloudSettings(BaseSettings):
    model_config = {"env_prefix": "whatsapp_cloud_"}

    token: str = ""
    phone_number_id: str = ""
    verify_token: str = ""


class SignalSettings(BaseSettings):
    model_config = {"env_prefix": "signal_"}

    url: str = "http://localhost:8080"


class TelegramSettings(BaseSettings):
    model_config = {"env_prefix": "telegram_"}

    bot_token: str = ""


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    database_url: str = "postgresql+asyncpg://gateway:gateway@localhost:5433/gateway"
    host: str = "0.0.0.0"
    port: int = 8002
    log_level: str = "INFO"

    evolution: EvolutionSettings = EvolutionSettings()
    smtp: SMTPSettings = SMTPSettings()
    twilio: TwilioSettings = TwilioSettings()
    mailu: MailuSettings = MailuSettings()
    firebase: FirebaseSettings = FirebaseSettings()
    whatsapp_cloud: WhatsAppCloudSettings = WhatsAppCloudSettings()
    signal: SignalSettings = SignalSettings()
    telegram: TelegramSettings = TelegramSettings()


settings = Settings()

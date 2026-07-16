from enum import StrEnum


class CommunicationChannelType(StrEnum):
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    SMS = "SMS"
    PUSH = "PUSH"


class CommunicationProviderType(StrEnum):
    EVOLUTION = "EVOLUTION"
    RESEND = "RESEND"
    MAILU = "MAILU"
    SMTP = "SMTP"
    STALWART = "STALWART"
    TWILIO = "TWILIO"
    FIREBASE = "FIREBASE"
    WHATSAPP_CLOUD = "WHATSAPP_CLOUD"
    SIGNAL = "SIGNAL"
    TELEGRAM = "TELEGRAM"


class DeliveryStatus(StrEnum):
    UNKNOWN = "UNKNOWN"
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class AttachmentType(StrEnum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    DOCUMENT = "DOCUMENT"
    FILE = "FILE"


class ProviderStatus(StrEnum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    ERROR = "ERROR"
    CONFIGURING = "CONFIGURING"

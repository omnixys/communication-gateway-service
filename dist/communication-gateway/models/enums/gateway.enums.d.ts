export declare enum CommunicationChannelType {
    WHATSAPP = "WHATSAPP",
    EMAIL = "EMAIL",
    SMS = "SMS",
    PUSH = "PUSH"
}
export declare enum CommunicationProviderType {
    EVOLUTION = "EVOLUTION",
    RESEND = "RESEND",
    STALWART = "STALWART"
}
export declare enum DeliveryStatus {
    UNKNOWN = "UNKNOWN",
    PENDING = "PENDING",
    QUEUED = "QUEUED",
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    READ = "READ",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED"
}
export declare enum AttachmentType {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    AUDIO = "AUDIO",
    DOCUMENT = "DOCUMENT",
    FILE = "FILE"
}
export declare enum ProviderStatus {
    CONNECTED = "CONNECTED",
    DISCONNECTED = "DISCONNECTED",
    ERROR = "ERROR",
    CONFIGURING = "CONFIGURING"
}
export declare enum ContentType {
    TEXT = "TEXT",
    HTML = "HTML"
}
export declare function parseCommunicationChannelType(value: string): CommunicationChannelType;
export declare function parseCommunicationProviderType(value: string): CommunicationProviderType;
export declare function parseDeliveryStatus(value: string): DeliveryStatus;
export declare function parseContentType(value: string): ContentType;

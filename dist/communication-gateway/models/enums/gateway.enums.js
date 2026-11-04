export var CommunicationChannelType;
(function (CommunicationChannelType) {
    CommunicationChannelType["WHATSAPP"] = "WHATSAPP";
    CommunicationChannelType["EMAIL"] = "EMAIL";
    CommunicationChannelType["SMS"] = "SMS";
    CommunicationChannelType["PUSH"] = "PUSH";
})(CommunicationChannelType || (CommunicationChannelType = {}));
export var CommunicationProviderType;
(function (CommunicationProviderType) {
    CommunicationProviderType["EVOLUTION"] = "EVOLUTION";
    CommunicationProviderType["RESEND"] = "RESEND";
    CommunicationProviderType["STALWART"] = "STALWART";
})(CommunicationProviderType || (CommunicationProviderType = {}));
export var DeliveryStatus;
(function (DeliveryStatus) {
    DeliveryStatus["UNKNOWN"] = "UNKNOWN";
    DeliveryStatus["PENDING"] = "PENDING";
    DeliveryStatus["QUEUED"] = "QUEUED";
    DeliveryStatus["SENT"] = "SENT";
    DeliveryStatus["DELIVERED"] = "DELIVERED";
    DeliveryStatus["READ"] = "READ";
    DeliveryStatus["FAILED"] = "FAILED";
    DeliveryStatus["CANCELLED"] = "CANCELLED";
})(DeliveryStatus || (DeliveryStatus = {}));
export var AttachmentType;
(function (AttachmentType) {
    AttachmentType["IMAGE"] = "IMAGE";
    AttachmentType["VIDEO"] = "VIDEO";
    AttachmentType["AUDIO"] = "AUDIO";
    AttachmentType["DOCUMENT"] = "DOCUMENT";
    AttachmentType["FILE"] = "FILE";
})(AttachmentType || (AttachmentType = {}));
export var ProviderStatus;
(function (ProviderStatus) {
    ProviderStatus["CONNECTED"] = "CONNECTED";
    ProviderStatus["DISCONNECTED"] = "DISCONNECTED";
    ProviderStatus["ERROR"] = "ERROR";
    ProviderStatus["CONFIGURING"] = "CONFIGURING";
})(ProviderStatus || (ProviderStatus = {}));
export var ContentType;
(function (ContentType) {
    ContentType["TEXT"] = "TEXT";
    ContentType["HTML"] = "HTML";
})(ContentType || (ContentType = {}));
export function parseCommunicationChannelType(value) {
    const normalized = value.trim().toUpperCase();
    const channel = Object.values(CommunicationChannelType).find((candidate) => candidate === normalized);
    if (channel === undefined) {
        throw new RangeError(`Unsupported communication channel: ${value}`);
    }
    return channel;
}
export function parseCommunicationProviderType(value) {
    const normalized = value.trim().toUpperCase();
    const provider = Object.values(CommunicationProviderType).find((candidate) => candidate === normalized);
    if (provider === undefined) {
        throw new RangeError(`Unknown provider type: ${value}`);
    }
    return provider;
}
export function parseDeliveryStatus(value) {
    const normalized = value.trim().toUpperCase();
    const status = Object.values(DeliveryStatus).find((candidate) => candidate === normalized);
    if (status === undefined) {
        throw new RangeError(`Unknown delivery status: ${value}`);
    }
    return status;
}
export function parseContentType(value) {
    const normalized = value.trim().toUpperCase();
    const content = Object.values(ContentType).find((candidate) => candidate === normalized);
    return content === undefined ? ContentType.TEXT : content;
}

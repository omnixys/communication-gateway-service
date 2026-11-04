export const EMPTY_CHANNEL_CAPABILITIES = Object.freeze({
    supports_attachments: false,
    supports_rich_text: false,
    supports_formatting: false,
    supports_typing: false,
    supports_read_receipts: false,
    supports_reactions: false,
    supports_quoted_replies: false,
    supports_forwarding: false,
    supports_editing: false,
    supports_deletion: false,
    supports_delivery_status: false,
    supports_presence: false,
    supports_templates: false,
    supports_bulk_messaging: false,
});
export const CHANNEL_CAPABILITY_KEYS = Object.keys(EMPTY_CHANNEL_CAPABILITIES);
export function mergeChannelCapabilities(...capabilitySets) {
    const merged = { ...EMPTY_CHANNEL_CAPABILITIES };
    for (const capabilities of capabilitySets) {
        for (const key of CHANNEL_CAPABILITY_KEYS) {
            if (capabilities[key]) {
                merged[key] = true;
            }
        }
    }
    return merged;
}
export function listCapabilityNames(capabilities) {
    return CHANNEL_CAPABILITY_KEYS.filter((key) => capabilities[key]).map((key) => key.slice('supports_'.length));
}

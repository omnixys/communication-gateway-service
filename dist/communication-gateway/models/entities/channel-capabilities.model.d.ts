export interface ChannelCapabilities {
    supports_attachments: boolean;
    supports_rich_text: boolean;
    supports_formatting: boolean;
    supports_typing: boolean;
    supports_read_receipts: boolean;
    supports_reactions: boolean;
    supports_quoted_replies: boolean;
    supports_forwarding: boolean;
    supports_editing: boolean;
    supports_deletion: boolean;
    supports_delivery_status: boolean;
    supports_presence: boolean;
    supports_templates: boolean;
    supports_bulk_messaging: boolean;
}
export declare const EMPTY_CHANNEL_CAPABILITIES: ChannelCapabilities;
export declare const CHANNEL_CAPABILITY_KEYS: ReadonlyArray<keyof ChannelCapabilities>;
export declare function mergeChannelCapabilities(...capabilitySets: readonly ChannelCapabilities[]): ChannelCapabilities;
export declare function listCapabilityNames(capabilities: ChannelCapabilities): string[];

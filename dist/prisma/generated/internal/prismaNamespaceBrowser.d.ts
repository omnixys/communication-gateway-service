import * as runtime from "@prisma/client/runtime/index-browser";
export type * from '../models.js';
export type * from './prismaNamespace.js';
export declare const Decimal: typeof runtime.Decimal;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
export declare const DbNull: import("@prisma/client/runtime/client").DbNullClass;
export declare const JsonNull: import("@prisma/client/runtime/client").JsonNullClass;
export declare const AnyNull: import("@prisma/client/runtime/client").AnyNullClass;
export declare const ModelName: {
    readonly ProviderConfig: "ProviderConfig";
    readonly ProviderConnection: "ProviderConnection";
    readonly DeliveryLog: "DeliveryLog";
    readonly MessageMapping: "MessageMapping";
    readonly AnalyticsOutbox: "AnalyticsOutbox";
};
export type ModelName = (typeof ModelName)[keyof typeof ModelName];
export declare const TransactionIsolationLevel: {
    readonly ReadUncommitted: "ReadUncommitted";
    readonly ReadCommitted: "ReadCommitted";
    readonly RepeatableRead: "RepeatableRead";
    readonly Serializable: "Serializable";
};
export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];
export declare const ProviderConfigScalarFieldEnum: {
    readonly id: "id";
    readonly providerType: "providerType";
    readonly enabled: "enabled";
    readonly settings: "settings";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type ProviderConfigScalarFieldEnum = (typeof ProviderConfigScalarFieldEnum)[keyof typeof ProviderConfigScalarFieldEnum];
export declare const ProviderConnectionScalarFieldEnum: {
    readonly id: "id";
    readonly providerType: "providerType";
    readonly status: "status";
    readonly details: "details";
    readonly connectedAt: "connectedAt";
    readonly updatedAt: "updatedAt";
};
export type ProviderConnectionScalarFieldEnum = (typeof ProviderConnectionScalarFieldEnum)[keyof typeof ProviderConnectionScalarFieldEnum];
export declare const DeliveryLogScalarFieldEnum: {
    readonly id: "id";
    readonly messageId: "messageId";
    readonly providerType: "providerType";
    readonly status: "status";
    readonly providerMessageId: "providerMessageId";
    readonly error: "error";
    readonly tenantId: "tenantId";
    readonly attempts: "attempts";
    readonly createdAt: "createdAt";
};
export type DeliveryLogScalarFieldEnum = (typeof DeliveryLogScalarFieldEnum)[keyof typeof DeliveryLogScalarFieldEnum];
export declare const MessageMappingScalarFieldEnum: {
    readonly id: "id";
    readonly internalId: "internalId";
    readonly providerMessageId: "providerMessageId";
    readonly provider: "provider";
    readonly channel: "channel";
    readonly conversationId: "conversationId";
    readonly sender: "sender";
    readonly recipient: "recipient";
    readonly status: "status";
    readonly tenantId: "tenantId";
    readonly organizationId: "organizationId";
    readonly providerInstance: "providerInstance";
    readonly retryCount: "retryCount";
    readonly lastStatusChange: "lastStatusChange";
    readonly lastError: "lastError";
    readonly metadata: "metadata";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type MessageMappingScalarFieldEnum = (typeof MessageMappingScalarFieldEnum)[keyof typeof MessageMappingScalarFieldEnum];
export declare const AnalyticsOutboxScalarFieldEnum: {
    readonly id: "id";
    readonly deduplicationKey: "deduplicationKey";
    readonly tenantId: "tenantId";
    readonly topic: "topic";
    readonly payload: "payload";
    readonly correlationId: "correlationId";
    readonly attempts: "attempts";
    readonly nextAttemptAt: "nextAttemptAt";
    readonly lockedAt: "lockedAt";
    readonly lockedBy: "lockedBy";
    readonly publishedAt: "publishedAt";
    readonly deadLetteredAt: "deadLetteredAt";
    readonly lastError: "lastError";
    readonly createdAt: "createdAt";
};
export type AnalyticsOutboxScalarFieldEnum = (typeof AnalyticsOutboxScalarFieldEnum)[keyof typeof AnalyticsOutboxScalarFieldEnum];
export declare const SortOrder: {
    readonly asc: "asc";
    readonly desc: "desc";
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export declare const NullableJsonNullValueInput: {
    readonly DbNull: import("@prisma/client/runtime/client").DbNullClass;
    readonly JsonNull: import("@prisma/client/runtime/client").JsonNullClass;
};
export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput];
export declare const JsonNullValueInput: {
    readonly JsonNull: import("@prisma/client/runtime/client").JsonNullClass;
};
export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput];
export declare const QueryMode: {
    readonly default: "default";
    readonly insensitive: "insensitive";
};
export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];
export declare const JsonNullValueFilter: {
    readonly DbNull: import("@prisma/client/runtime/client").DbNullClass;
    readonly JsonNull: import("@prisma/client/runtime/client").JsonNullClass;
    readonly AnyNull: import("@prisma/client/runtime/client").AnyNullClass;
};
export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter];
export declare const NullsOrder: {
    readonly first: "first";
    readonly last: "last";
};
export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder];

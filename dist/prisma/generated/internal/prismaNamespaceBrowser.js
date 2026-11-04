import * as runtime from "@prisma/client/runtime/index-browser";
export const Decimal = runtime.Decimal;
export const NullTypes = {
    DbNull: runtime.NullTypes.DbNull,
    JsonNull: runtime.NullTypes.JsonNull,
    AnyNull: runtime.NullTypes.AnyNull,
};
export const DbNull = runtime.DbNull;
export const JsonNull = runtime.JsonNull;
export const AnyNull = runtime.AnyNull;
export const ModelName = {
    ProviderConfig: 'ProviderConfig',
    ProviderConnection: 'ProviderConnection',
    DeliveryLog: 'DeliveryLog',
    MessageMapping: 'MessageMapping',
    AnalyticsOutbox: 'AnalyticsOutbox'
};
export const TransactionIsolationLevel = runtime.makeStrictEnum({
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
});
export const ProviderConfigScalarFieldEnum = {
    id: 'id',
    providerType: 'providerType',
    enabled: 'enabled',
    settings: 'settings',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const ProviderConnectionScalarFieldEnum = {
    id: 'id',
    providerType: 'providerType',
    status: 'status',
    details: 'details',
    connectedAt: 'connectedAt',
    updatedAt: 'updatedAt'
};
export const DeliveryLogScalarFieldEnum = {
    id: 'id',
    messageId: 'messageId',
    providerType: 'providerType',
    status: 'status',
    providerMessageId: 'providerMessageId',
    error: 'error',
    tenantId: 'tenantId',
    attempts: 'attempts',
    createdAt: 'createdAt'
};
export const MessageMappingScalarFieldEnum = {
    id: 'id',
    internalId: 'internalId',
    providerMessageId: 'providerMessageId',
    provider: 'provider',
    channel: 'channel',
    conversationId: 'conversationId',
    sender: 'sender',
    recipient: 'recipient',
    status: 'status',
    tenantId: 'tenantId',
    organizationId: 'organizationId',
    providerInstance: 'providerInstance',
    retryCount: 'retryCount',
    lastStatusChange: 'lastStatusChange',
    lastError: 'lastError',
    metadata: 'metadata',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
};
export const AnalyticsOutboxScalarFieldEnum = {
    id: 'id',
    deduplicationKey: 'deduplicationKey',
    tenantId: 'tenantId',
    topic: 'topic',
    payload: 'payload',
    correlationId: 'correlationId',
    attempts: 'attempts',
    nextAttemptAt: 'nextAttemptAt',
    lockedAt: 'lockedAt',
    lockedBy: 'lockedBy',
    publishedAt: 'publishedAt',
    deadLetteredAt: 'deadLetteredAt',
    lastError: 'lastError',
    createdAt: 'createdAt'
};
export const SortOrder = {
    asc: 'asc',
    desc: 'desc'
};
export const NullableJsonNullValueInput = {
    DbNull: DbNull,
    JsonNull: JsonNull
};
export const JsonNullValueInput = {
    JsonNull: JsonNull
};
export const QueryMode = {
    default: 'default',
    insensitive: 'insensitive'
};
export const JsonNullValueFilter = {
    DbNull: DbNull,
    JsonNull: JsonNull,
    AnyNull: AnyNull
};
export const NullsOrder = {
    first: 'first',
    last: 'last'
};

import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type AnalyticsOutboxModel = runtime.Types.Result.DefaultSelection<Prisma.$AnalyticsOutboxPayload>;
export type AggregateAnalyticsOutbox = {
    _count: AnalyticsOutboxCountAggregateOutputType | null;
    _avg: AnalyticsOutboxAvgAggregateOutputType | null;
    _sum: AnalyticsOutboxSumAggregateOutputType | null;
    _min: AnalyticsOutboxMinAggregateOutputType | null;
    _max: AnalyticsOutboxMaxAggregateOutputType | null;
};
export type AnalyticsOutboxAvgAggregateOutputType = {
    attempts: number | null;
};
export type AnalyticsOutboxSumAggregateOutputType = {
    attempts: number | null;
};
export type AnalyticsOutboxMinAggregateOutputType = {
    id: string | null;
    deduplicationKey: string | null;
    tenantId: string | null;
    topic: string | null;
    correlationId: string | null;
    attempts: number | null;
    nextAttemptAt: Date | null;
    lockedAt: Date | null;
    lockedBy: string | null;
    publishedAt: Date | null;
    deadLetteredAt: Date | null;
    lastError: string | null;
    createdAt: Date | null;
};
export type AnalyticsOutboxMaxAggregateOutputType = {
    id: string | null;
    deduplicationKey: string | null;
    tenantId: string | null;
    topic: string | null;
    correlationId: string | null;
    attempts: number | null;
    nextAttemptAt: Date | null;
    lockedAt: Date | null;
    lockedBy: string | null;
    publishedAt: Date | null;
    deadLetteredAt: Date | null;
    lastError: string | null;
    createdAt: Date | null;
};
export type AnalyticsOutboxCountAggregateOutputType = {
    id: number;
    deduplicationKey: number;
    tenantId: number;
    topic: number;
    payload: number;
    correlationId: number;
    attempts: number;
    nextAttemptAt: number;
    lockedAt: number;
    lockedBy: number;
    publishedAt: number;
    deadLetteredAt: number;
    lastError: number;
    createdAt: number;
    _all: number;
};
export type AnalyticsOutboxAvgAggregateInputType = {
    attempts?: true;
};
export type AnalyticsOutboxSumAggregateInputType = {
    attempts?: true;
};
export type AnalyticsOutboxMinAggregateInputType = {
    id?: true;
    deduplicationKey?: true;
    tenantId?: true;
    topic?: true;
    correlationId?: true;
    attempts?: true;
    nextAttemptAt?: true;
    lockedAt?: true;
    lockedBy?: true;
    publishedAt?: true;
    deadLetteredAt?: true;
    lastError?: true;
    createdAt?: true;
};
export type AnalyticsOutboxMaxAggregateInputType = {
    id?: true;
    deduplicationKey?: true;
    tenantId?: true;
    topic?: true;
    correlationId?: true;
    attempts?: true;
    nextAttemptAt?: true;
    lockedAt?: true;
    lockedBy?: true;
    publishedAt?: true;
    deadLetteredAt?: true;
    lastError?: true;
    createdAt?: true;
};
export type AnalyticsOutboxCountAggregateInputType = {
    id?: true;
    deduplicationKey?: true;
    tenantId?: true;
    topic?: true;
    payload?: true;
    correlationId?: true;
    attempts?: true;
    nextAttemptAt?: true;
    lockedAt?: true;
    lockedBy?: true;
    publishedAt?: true;
    deadLetteredAt?: true;
    lastError?: true;
    createdAt?: true;
    _all?: true;
};
export type AnalyticsOutboxAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.AnalyticsOutboxWhereInput;
    orderBy?: Prisma.AnalyticsOutboxOrderByWithRelationInput | Prisma.AnalyticsOutboxOrderByWithRelationInput[];
    cursor?: Prisma.AnalyticsOutboxWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | AnalyticsOutboxCountAggregateInputType;
    _avg?: AnalyticsOutboxAvgAggregateInputType;
    _sum?: AnalyticsOutboxSumAggregateInputType;
    _min?: AnalyticsOutboxMinAggregateInputType;
    _max?: AnalyticsOutboxMaxAggregateInputType;
};
export type GetAnalyticsOutboxAggregateType<T extends AnalyticsOutboxAggregateArgs> = {
    [P in keyof T & keyof AggregateAnalyticsOutbox]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateAnalyticsOutbox[P]> : Prisma.GetScalarType<T[P], AggregateAnalyticsOutbox[P]>;
};
export type AnalyticsOutboxGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.AnalyticsOutboxWhereInput;
    orderBy?: Prisma.AnalyticsOutboxOrderByWithAggregationInput | Prisma.AnalyticsOutboxOrderByWithAggregationInput[];
    by: Prisma.AnalyticsOutboxScalarFieldEnum[] | Prisma.AnalyticsOutboxScalarFieldEnum;
    having?: Prisma.AnalyticsOutboxScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: AnalyticsOutboxCountAggregateInputType | true;
    _avg?: AnalyticsOutboxAvgAggregateInputType;
    _sum?: AnalyticsOutboxSumAggregateInputType;
    _min?: AnalyticsOutboxMinAggregateInputType;
    _max?: AnalyticsOutboxMaxAggregateInputType;
};
export type AnalyticsOutboxGroupByOutputType = {
    id: string;
    deduplicationKey: string;
    tenantId: string;
    topic: string;
    payload: runtime.JsonValue;
    correlationId: string | null;
    attempts: number;
    nextAttemptAt: Date;
    lockedAt: Date | null;
    lockedBy: string | null;
    publishedAt: Date | null;
    deadLetteredAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    _count: AnalyticsOutboxCountAggregateOutputType | null;
    _avg: AnalyticsOutboxAvgAggregateOutputType | null;
    _sum: AnalyticsOutboxSumAggregateOutputType | null;
    _min: AnalyticsOutboxMinAggregateOutputType | null;
    _max: AnalyticsOutboxMaxAggregateOutputType | null;
};
export type GetAnalyticsOutboxGroupByPayload<T extends AnalyticsOutboxGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<AnalyticsOutboxGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof AnalyticsOutboxGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], AnalyticsOutboxGroupByOutputType[P]> : Prisma.GetScalarType<T[P], AnalyticsOutboxGroupByOutputType[P]>;
}>>;
export type AnalyticsOutboxWhereInput = {
    AND?: Prisma.AnalyticsOutboxWhereInput | Prisma.AnalyticsOutboxWhereInput[];
    OR?: Prisma.AnalyticsOutboxWhereInput[];
    NOT?: Prisma.AnalyticsOutboxWhereInput | Prisma.AnalyticsOutboxWhereInput[];
    id?: Prisma.StringFilter<"AnalyticsOutbox"> | string;
    deduplicationKey?: Prisma.StringFilter<"AnalyticsOutbox"> | string;
    tenantId?: Prisma.StringFilter<"AnalyticsOutbox"> | string;
    topic?: Prisma.StringFilter<"AnalyticsOutbox"> | string;
    payload?: Prisma.JsonFilter<"AnalyticsOutbox">;
    correlationId?: Prisma.StringNullableFilter<"AnalyticsOutbox"> | string | null;
    attempts?: Prisma.IntFilter<"AnalyticsOutbox"> | number;
    nextAttemptAt?: Prisma.DateTimeFilter<"AnalyticsOutbox"> | Date | string;
    lockedAt?: Prisma.DateTimeNullableFilter<"AnalyticsOutbox"> | Date | string | null;
    lockedBy?: Prisma.StringNullableFilter<"AnalyticsOutbox"> | string | null;
    publishedAt?: Prisma.DateTimeNullableFilter<"AnalyticsOutbox"> | Date | string | null;
    deadLetteredAt?: Prisma.DateTimeNullableFilter<"AnalyticsOutbox"> | Date | string | null;
    lastError?: Prisma.StringNullableFilter<"AnalyticsOutbox"> | string | null;
    createdAt?: Prisma.DateTimeFilter<"AnalyticsOutbox"> | Date | string;
};
export type AnalyticsOutboxOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    deduplicationKey?: Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    topic?: Prisma.SortOrder;
    payload?: Prisma.SortOrder;
    correlationId?: Prisma.SortOrderInput | Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    nextAttemptAt?: Prisma.SortOrder;
    lockedAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    lockedBy?: Prisma.SortOrderInput | Prisma.SortOrder;
    publishedAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    deadLetteredAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    lastError?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type AnalyticsOutboxWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    deduplicationKey?: string;
    AND?: Prisma.AnalyticsOutboxWhereInput | Prisma.AnalyticsOutboxWhereInput[];
    OR?: Prisma.AnalyticsOutboxWhereInput[];
    NOT?: Prisma.AnalyticsOutboxWhereInput | Prisma.AnalyticsOutboxWhereInput[];
    tenantId?: Prisma.StringFilter<"AnalyticsOutbox"> | string;
    topic?: Prisma.StringFilter<"AnalyticsOutbox"> | string;
    payload?: Prisma.JsonFilter<"AnalyticsOutbox">;
    correlationId?: Prisma.StringNullableFilter<"AnalyticsOutbox"> | string | null;
    attempts?: Prisma.IntFilter<"AnalyticsOutbox"> | number;
    nextAttemptAt?: Prisma.DateTimeFilter<"AnalyticsOutbox"> | Date | string;
    lockedAt?: Prisma.DateTimeNullableFilter<"AnalyticsOutbox"> | Date | string | null;
    lockedBy?: Prisma.StringNullableFilter<"AnalyticsOutbox"> | string | null;
    publishedAt?: Prisma.DateTimeNullableFilter<"AnalyticsOutbox"> | Date | string | null;
    deadLetteredAt?: Prisma.DateTimeNullableFilter<"AnalyticsOutbox"> | Date | string | null;
    lastError?: Prisma.StringNullableFilter<"AnalyticsOutbox"> | string | null;
    createdAt?: Prisma.DateTimeFilter<"AnalyticsOutbox"> | Date | string;
}, "id" | "deduplicationKey">;
export type AnalyticsOutboxOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    deduplicationKey?: Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    topic?: Prisma.SortOrder;
    payload?: Prisma.SortOrder;
    correlationId?: Prisma.SortOrderInput | Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    nextAttemptAt?: Prisma.SortOrder;
    lockedAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    lockedBy?: Prisma.SortOrderInput | Prisma.SortOrder;
    publishedAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    deadLetteredAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    lastError?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    _count?: Prisma.AnalyticsOutboxCountOrderByAggregateInput;
    _avg?: Prisma.AnalyticsOutboxAvgOrderByAggregateInput;
    _max?: Prisma.AnalyticsOutboxMaxOrderByAggregateInput;
    _min?: Prisma.AnalyticsOutboxMinOrderByAggregateInput;
    _sum?: Prisma.AnalyticsOutboxSumOrderByAggregateInput;
};
export type AnalyticsOutboxScalarWhereWithAggregatesInput = {
    AND?: Prisma.AnalyticsOutboxScalarWhereWithAggregatesInput | Prisma.AnalyticsOutboxScalarWhereWithAggregatesInput[];
    OR?: Prisma.AnalyticsOutboxScalarWhereWithAggregatesInput[];
    NOT?: Prisma.AnalyticsOutboxScalarWhereWithAggregatesInput | Prisma.AnalyticsOutboxScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"AnalyticsOutbox"> | string;
    deduplicationKey?: Prisma.StringWithAggregatesFilter<"AnalyticsOutbox"> | string;
    tenantId?: Prisma.StringWithAggregatesFilter<"AnalyticsOutbox"> | string;
    topic?: Prisma.StringWithAggregatesFilter<"AnalyticsOutbox"> | string;
    payload?: Prisma.JsonWithAggregatesFilter<"AnalyticsOutbox">;
    correlationId?: Prisma.StringNullableWithAggregatesFilter<"AnalyticsOutbox"> | string | null;
    attempts?: Prisma.IntWithAggregatesFilter<"AnalyticsOutbox"> | number;
    nextAttemptAt?: Prisma.DateTimeWithAggregatesFilter<"AnalyticsOutbox"> | Date | string;
    lockedAt?: Prisma.DateTimeNullableWithAggregatesFilter<"AnalyticsOutbox"> | Date | string | null;
    lockedBy?: Prisma.StringNullableWithAggregatesFilter<"AnalyticsOutbox"> | string | null;
    publishedAt?: Prisma.DateTimeNullableWithAggregatesFilter<"AnalyticsOutbox"> | Date | string | null;
    deadLetteredAt?: Prisma.DateTimeNullableWithAggregatesFilter<"AnalyticsOutbox"> | Date | string | null;
    lastError?: Prisma.StringNullableWithAggregatesFilter<"AnalyticsOutbox"> | string | null;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"AnalyticsOutbox"> | Date | string;
};
export type AnalyticsOutboxCreateInput = {
    id: string;
    deduplicationKey: string;
    tenantId: string;
    topic: string;
    payload: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    correlationId?: string | null;
    attempts?: number;
    nextAttemptAt?: Date | string;
    lockedAt?: Date | string | null;
    lockedBy?: string | null;
    publishedAt?: Date | string | null;
    deadLetteredAt?: Date | string | null;
    lastError?: string | null;
    createdAt?: Date | string;
};
export type AnalyticsOutboxUncheckedCreateInput = {
    id: string;
    deduplicationKey: string;
    tenantId: string;
    topic: string;
    payload: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    correlationId?: string | null;
    attempts?: number;
    nextAttemptAt?: Date | string;
    lockedAt?: Date | string | null;
    lockedBy?: string | null;
    publishedAt?: Date | string | null;
    deadLetteredAt?: Date | string | null;
    lastError?: string | null;
    createdAt?: Date | string;
};
export type AnalyticsOutboxUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    deduplicationKey?: Prisma.StringFieldUpdateOperationsInput | string;
    tenantId?: Prisma.StringFieldUpdateOperationsInput | string;
    topic?: Prisma.StringFieldUpdateOperationsInput | string;
    payload?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    correlationId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    attempts?: Prisma.IntFieldUpdateOperationsInput | number;
    nextAttemptAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    lockedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lockedBy?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    publishedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    deadLetteredAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type AnalyticsOutboxUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    deduplicationKey?: Prisma.StringFieldUpdateOperationsInput | string;
    tenantId?: Prisma.StringFieldUpdateOperationsInput | string;
    topic?: Prisma.StringFieldUpdateOperationsInput | string;
    payload?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    correlationId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    attempts?: Prisma.IntFieldUpdateOperationsInput | number;
    nextAttemptAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    lockedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lockedBy?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    publishedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    deadLetteredAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type AnalyticsOutboxCreateManyInput = {
    id: string;
    deduplicationKey: string;
    tenantId: string;
    topic: string;
    payload: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    correlationId?: string | null;
    attempts?: number;
    nextAttemptAt?: Date | string;
    lockedAt?: Date | string | null;
    lockedBy?: string | null;
    publishedAt?: Date | string | null;
    deadLetteredAt?: Date | string | null;
    lastError?: string | null;
    createdAt?: Date | string;
};
export type AnalyticsOutboxUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    deduplicationKey?: Prisma.StringFieldUpdateOperationsInput | string;
    tenantId?: Prisma.StringFieldUpdateOperationsInput | string;
    topic?: Prisma.StringFieldUpdateOperationsInput | string;
    payload?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    correlationId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    attempts?: Prisma.IntFieldUpdateOperationsInput | number;
    nextAttemptAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    lockedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lockedBy?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    publishedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    deadLetteredAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type AnalyticsOutboxUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    deduplicationKey?: Prisma.StringFieldUpdateOperationsInput | string;
    tenantId?: Prisma.StringFieldUpdateOperationsInput | string;
    topic?: Prisma.StringFieldUpdateOperationsInput | string;
    payload?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    correlationId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    attempts?: Prisma.IntFieldUpdateOperationsInput | number;
    nextAttemptAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    lockedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lockedBy?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    publishedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    deadLetteredAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type AnalyticsOutboxCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    deduplicationKey?: Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    topic?: Prisma.SortOrder;
    payload?: Prisma.SortOrder;
    correlationId?: Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    nextAttemptAt?: Prisma.SortOrder;
    lockedAt?: Prisma.SortOrder;
    lockedBy?: Prisma.SortOrder;
    publishedAt?: Prisma.SortOrder;
    deadLetteredAt?: Prisma.SortOrder;
    lastError?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type AnalyticsOutboxAvgOrderByAggregateInput = {
    attempts?: Prisma.SortOrder;
};
export type AnalyticsOutboxMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    deduplicationKey?: Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    topic?: Prisma.SortOrder;
    correlationId?: Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    nextAttemptAt?: Prisma.SortOrder;
    lockedAt?: Prisma.SortOrder;
    lockedBy?: Prisma.SortOrder;
    publishedAt?: Prisma.SortOrder;
    deadLetteredAt?: Prisma.SortOrder;
    lastError?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type AnalyticsOutboxMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    deduplicationKey?: Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    topic?: Prisma.SortOrder;
    correlationId?: Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    nextAttemptAt?: Prisma.SortOrder;
    lockedAt?: Prisma.SortOrder;
    lockedBy?: Prisma.SortOrder;
    publishedAt?: Prisma.SortOrder;
    deadLetteredAt?: Prisma.SortOrder;
    lastError?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type AnalyticsOutboxSumOrderByAggregateInput = {
    attempts?: Prisma.SortOrder;
};
export type AnalyticsOutboxSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    deduplicationKey?: boolean;
    tenantId?: boolean;
    topic?: boolean;
    payload?: boolean;
    correlationId?: boolean;
    attempts?: boolean;
    nextAttemptAt?: boolean;
    lockedAt?: boolean;
    lockedBy?: boolean;
    publishedAt?: boolean;
    deadLetteredAt?: boolean;
    lastError?: boolean;
    createdAt?: boolean;
}, ExtArgs["result"]["analyticsOutbox"]>;
export type AnalyticsOutboxSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    deduplicationKey?: boolean;
    tenantId?: boolean;
    topic?: boolean;
    payload?: boolean;
    correlationId?: boolean;
    attempts?: boolean;
    nextAttemptAt?: boolean;
    lockedAt?: boolean;
    lockedBy?: boolean;
    publishedAt?: boolean;
    deadLetteredAt?: boolean;
    lastError?: boolean;
    createdAt?: boolean;
}, ExtArgs["result"]["analyticsOutbox"]>;
export type AnalyticsOutboxSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    deduplicationKey?: boolean;
    tenantId?: boolean;
    topic?: boolean;
    payload?: boolean;
    correlationId?: boolean;
    attempts?: boolean;
    nextAttemptAt?: boolean;
    lockedAt?: boolean;
    lockedBy?: boolean;
    publishedAt?: boolean;
    deadLetteredAt?: boolean;
    lastError?: boolean;
    createdAt?: boolean;
}, ExtArgs["result"]["analyticsOutbox"]>;
export type AnalyticsOutboxSelectScalar = {
    id?: boolean;
    deduplicationKey?: boolean;
    tenantId?: boolean;
    topic?: boolean;
    payload?: boolean;
    correlationId?: boolean;
    attempts?: boolean;
    nextAttemptAt?: boolean;
    lockedAt?: boolean;
    lockedBy?: boolean;
    publishedAt?: boolean;
    deadLetteredAt?: boolean;
    lastError?: boolean;
    createdAt?: boolean;
};
export type AnalyticsOutboxOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "deduplicationKey" | "tenantId" | "topic" | "payload" | "correlationId" | "attempts" | "nextAttemptAt" | "lockedAt" | "lockedBy" | "publishedAt" | "deadLetteredAt" | "lastError" | "createdAt", ExtArgs["result"]["analyticsOutbox"]>;
export type $AnalyticsOutboxPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "AnalyticsOutbox";
    objects: {};
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        deduplicationKey: string;
        tenantId: string;
        topic: string;
        payload: runtime.JsonValue;
        correlationId: string | null;
        attempts: number;
        nextAttemptAt: Date;
        lockedAt: Date | null;
        lockedBy: string | null;
        publishedAt: Date | null;
        deadLetteredAt: Date | null;
        lastError: string | null;
        createdAt: Date;
    }, ExtArgs["result"]["analyticsOutbox"]>;
    composites: {};
};
export type AnalyticsOutboxGetPayload<S extends boolean | null | undefined | AnalyticsOutboxDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload, S>;
export type AnalyticsOutboxCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<AnalyticsOutboxFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: AnalyticsOutboxCountAggregateInputType | true;
};
export interface AnalyticsOutboxDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['AnalyticsOutbox'];
        meta: {
            name: 'AnalyticsOutbox';
        };
    };
    findUnique<T extends AnalyticsOutboxFindUniqueArgs>(args: Prisma.SelectSubset<T, AnalyticsOutboxFindUniqueArgs<ExtArgs>>): Prisma.Prisma__AnalyticsOutboxClient<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends AnalyticsOutboxFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, AnalyticsOutboxFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__AnalyticsOutboxClient<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends AnalyticsOutboxFindFirstArgs>(args?: Prisma.SelectSubset<T, AnalyticsOutboxFindFirstArgs<ExtArgs>>): Prisma.Prisma__AnalyticsOutboxClient<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends AnalyticsOutboxFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, AnalyticsOutboxFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__AnalyticsOutboxClient<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends AnalyticsOutboxFindManyArgs>(args?: Prisma.SelectSubset<T, AnalyticsOutboxFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends AnalyticsOutboxCreateArgs>(args: Prisma.SelectSubset<T, AnalyticsOutboxCreateArgs<ExtArgs>>): Prisma.Prisma__AnalyticsOutboxClient<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends AnalyticsOutboxCreateManyArgs>(args?: Prisma.SelectSubset<T, AnalyticsOutboxCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends AnalyticsOutboxCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, AnalyticsOutboxCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends AnalyticsOutboxDeleteArgs>(args: Prisma.SelectSubset<T, AnalyticsOutboxDeleteArgs<ExtArgs>>): Prisma.Prisma__AnalyticsOutboxClient<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends AnalyticsOutboxUpdateArgs>(args: Prisma.SelectSubset<T, AnalyticsOutboxUpdateArgs<ExtArgs>>): Prisma.Prisma__AnalyticsOutboxClient<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends AnalyticsOutboxDeleteManyArgs>(args?: Prisma.SelectSubset<T, AnalyticsOutboxDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends AnalyticsOutboxUpdateManyArgs>(args: Prisma.SelectSubset<T, AnalyticsOutboxUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends AnalyticsOutboxUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, AnalyticsOutboxUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends AnalyticsOutboxUpsertArgs>(args: Prisma.SelectSubset<T, AnalyticsOutboxUpsertArgs<ExtArgs>>): Prisma.Prisma__AnalyticsOutboxClient<runtime.Types.Result.GetResult<Prisma.$AnalyticsOutboxPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends AnalyticsOutboxCountArgs>(args?: Prisma.Subset<T, AnalyticsOutboxCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], AnalyticsOutboxCountAggregateOutputType> : number>;
    aggregate<T extends AnalyticsOutboxAggregateArgs>(args: Prisma.Subset<T, AnalyticsOutboxAggregateArgs>): Prisma.PrismaPromise<GetAnalyticsOutboxAggregateType<T>>;
    groupBy<T extends AnalyticsOutboxGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: AnalyticsOutboxGroupByArgs['orderBy'];
    } : {
        orderBy?: AnalyticsOutboxGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, AnalyticsOutboxGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAnalyticsOutboxGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: AnalyticsOutboxFieldRefs;
}
export interface Prisma__AnalyticsOutboxClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface AnalyticsOutboxFieldRefs {
    readonly id: Prisma.FieldRef<"AnalyticsOutbox", 'String'>;
    readonly deduplicationKey: Prisma.FieldRef<"AnalyticsOutbox", 'String'>;
    readonly tenantId: Prisma.FieldRef<"AnalyticsOutbox", 'String'>;
    readonly topic: Prisma.FieldRef<"AnalyticsOutbox", 'String'>;
    readonly payload: Prisma.FieldRef<"AnalyticsOutbox", 'Json'>;
    readonly correlationId: Prisma.FieldRef<"AnalyticsOutbox", 'String'>;
    readonly attempts: Prisma.FieldRef<"AnalyticsOutbox", 'Int'>;
    readonly nextAttemptAt: Prisma.FieldRef<"AnalyticsOutbox", 'DateTime'>;
    readonly lockedAt: Prisma.FieldRef<"AnalyticsOutbox", 'DateTime'>;
    readonly lockedBy: Prisma.FieldRef<"AnalyticsOutbox", 'String'>;
    readonly publishedAt: Prisma.FieldRef<"AnalyticsOutbox", 'DateTime'>;
    readonly deadLetteredAt: Prisma.FieldRef<"AnalyticsOutbox", 'DateTime'>;
    readonly lastError: Prisma.FieldRef<"AnalyticsOutbox", 'String'>;
    readonly createdAt: Prisma.FieldRef<"AnalyticsOutbox", 'DateTime'>;
}
export type AnalyticsOutboxFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    where: Prisma.AnalyticsOutboxWhereUniqueInput;
};
export type AnalyticsOutboxFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    where: Prisma.AnalyticsOutboxWhereUniqueInput;
};
export type AnalyticsOutboxFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    where?: Prisma.AnalyticsOutboxWhereInput;
    orderBy?: Prisma.AnalyticsOutboxOrderByWithRelationInput | Prisma.AnalyticsOutboxOrderByWithRelationInput[];
    cursor?: Prisma.AnalyticsOutboxWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.AnalyticsOutboxScalarFieldEnum | Prisma.AnalyticsOutboxScalarFieldEnum[];
};
export type AnalyticsOutboxFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    where?: Prisma.AnalyticsOutboxWhereInput;
    orderBy?: Prisma.AnalyticsOutboxOrderByWithRelationInput | Prisma.AnalyticsOutboxOrderByWithRelationInput[];
    cursor?: Prisma.AnalyticsOutboxWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.AnalyticsOutboxScalarFieldEnum | Prisma.AnalyticsOutboxScalarFieldEnum[];
};
export type AnalyticsOutboxFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    where?: Prisma.AnalyticsOutboxWhereInput;
    orderBy?: Prisma.AnalyticsOutboxOrderByWithRelationInput | Prisma.AnalyticsOutboxOrderByWithRelationInput[];
    cursor?: Prisma.AnalyticsOutboxWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.AnalyticsOutboxScalarFieldEnum | Prisma.AnalyticsOutboxScalarFieldEnum[];
};
export type AnalyticsOutboxCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.AnalyticsOutboxCreateInput, Prisma.AnalyticsOutboxUncheckedCreateInput>;
};
export type AnalyticsOutboxCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.AnalyticsOutboxCreateManyInput | Prisma.AnalyticsOutboxCreateManyInput[];
    skipDuplicates?: boolean;
};
export type AnalyticsOutboxCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    data: Prisma.AnalyticsOutboxCreateManyInput | Prisma.AnalyticsOutboxCreateManyInput[];
    skipDuplicates?: boolean;
};
export type AnalyticsOutboxUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.AnalyticsOutboxUpdateInput, Prisma.AnalyticsOutboxUncheckedUpdateInput>;
    where: Prisma.AnalyticsOutboxWhereUniqueInput;
};
export type AnalyticsOutboxUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.AnalyticsOutboxUpdateManyMutationInput, Prisma.AnalyticsOutboxUncheckedUpdateManyInput>;
    where?: Prisma.AnalyticsOutboxWhereInput;
    limit?: number;
};
export type AnalyticsOutboxUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.AnalyticsOutboxUpdateManyMutationInput, Prisma.AnalyticsOutboxUncheckedUpdateManyInput>;
    where?: Prisma.AnalyticsOutboxWhereInput;
    limit?: number;
};
export type AnalyticsOutboxUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    where: Prisma.AnalyticsOutboxWhereUniqueInput;
    create: Prisma.XOR<Prisma.AnalyticsOutboxCreateInput, Prisma.AnalyticsOutboxUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.AnalyticsOutboxUpdateInput, Prisma.AnalyticsOutboxUncheckedUpdateInput>;
};
export type AnalyticsOutboxDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
    where: Prisma.AnalyticsOutboxWhereUniqueInput;
};
export type AnalyticsOutboxDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.AnalyticsOutboxWhereInput;
    limit?: number;
};
export type AnalyticsOutboxDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.AnalyticsOutboxSelect<ExtArgs> | null;
    omit?: Prisma.AnalyticsOutboxOmit<ExtArgs> | null;
};

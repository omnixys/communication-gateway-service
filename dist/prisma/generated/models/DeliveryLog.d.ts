import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type DeliveryLogModel = runtime.Types.Result.DefaultSelection<Prisma.$DeliveryLogPayload>;
export type AggregateDeliveryLog = {
    _count: DeliveryLogCountAggregateOutputType | null;
    _avg: DeliveryLogAvgAggregateOutputType | null;
    _sum: DeliveryLogSumAggregateOutputType | null;
    _min: DeliveryLogMinAggregateOutputType | null;
    _max: DeliveryLogMaxAggregateOutputType | null;
};
export type DeliveryLogAvgAggregateOutputType = {
    attempts: number | null;
};
export type DeliveryLogSumAggregateOutputType = {
    attempts: number | null;
};
export type DeliveryLogMinAggregateOutputType = {
    id: string | null;
    messageId: string | null;
    providerType: string | null;
    status: string | null;
    providerMessageId: string | null;
    error: string | null;
    tenantId: string | null;
    attempts: number | null;
    createdAt: Date | null;
};
export type DeliveryLogMaxAggregateOutputType = {
    id: string | null;
    messageId: string | null;
    providerType: string | null;
    status: string | null;
    providerMessageId: string | null;
    error: string | null;
    tenantId: string | null;
    attempts: number | null;
    createdAt: Date | null;
};
export type DeliveryLogCountAggregateOutputType = {
    id: number;
    messageId: number;
    providerType: number;
    status: number;
    providerMessageId: number;
    error: number;
    tenantId: number;
    attempts: number;
    createdAt: number;
    _all: number;
};
export type DeliveryLogAvgAggregateInputType = {
    attempts?: true;
};
export type DeliveryLogSumAggregateInputType = {
    attempts?: true;
};
export type DeliveryLogMinAggregateInputType = {
    id?: true;
    messageId?: true;
    providerType?: true;
    status?: true;
    providerMessageId?: true;
    error?: true;
    tenantId?: true;
    attempts?: true;
    createdAt?: true;
};
export type DeliveryLogMaxAggregateInputType = {
    id?: true;
    messageId?: true;
    providerType?: true;
    status?: true;
    providerMessageId?: true;
    error?: true;
    tenantId?: true;
    attempts?: true;
    createdAt?: true;
};
export type DeliveryLogCountAggregateInputType = {
    id?: true;
    messageId?: true;
    providerType?: true;
    status?: true;
    providerMessageId?: true;
    error?: true;
    tenantId?: true;
    attempts?: true;
    createdAt?: true;
    _all?: true;
};
export type DeliveryLogAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.DeliveryLogWhereInput;
    orderBy?: Prisma.DeliveryLogOrderByWithRelationInput | Prisma.DeliveryLogOrderByWithRelationInput[];
    cursor?: Prisma.DeliveryLogWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | DeliveryLogCountAggregateInputType;
    _avg?: DeliveryLogAvgAggregateInputType;
    _sum?: DeliveryLogSumAggregateInputType;
    _min?: DeliveryLogMinAggregateInputType;
    _max?: DeliveryLogMaxAggregateInputType;
};
export type GetDeliveryLogAggregateType<T extends DeliveryLogAggregateArgs> = {
    [P in keyof T & keyof AggregateDeliveryLog]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateDeliveryLog[P]> : Prisma.GetScalarType<T[P], AggregateDeliveryLog[P]>;
};
export type DeliveryLogGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.DeliveryLogWhereInput;
    orderBy?: Prisma.DeliveryLogOrderByWithAggregationInput | Prisma.DeliveryLogOrderByWithAggregationInput[];
    by: Prisma.DeliveryLogScalarFieldEnum[] | Prisma.DeliveryLogScalarFieldEnum;
    having?: Prisma.DeliveryLogScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: DeliveryLogCountAggregateInputType | true;
    _avg?: DeliveryLogAvgAggregateInputType;
    _sum?: DeliveryLogSumAggregateInputType;
    _min?: DeliveryLogMinAggregateInputType;
    _max?: DeliveryLogMaxAggregateInputType;
};
export type DeliveryLogGroupByOutputType = {
    id: string;
    messageId: string;
    providerType: string;
    status: string;
    providerMessageId: string | null;
    error: string | null;
    tenantId: string;
    attempts: number;
    createdAt: Date;
    _count: DeliveryLogCountAggregateOutputType | null;
    _avg: DeliveryLogAvgAggregateOutputType | null;
    _sum: DeliveryLogSumAggregateOutputType | null;
    _min: DeliveryLogMinAggregateOutputType | null;
    _max: DeliveryLogMaxAggregateOutputType | null;
};
export type GetDeliveryLogGroupByPayload<T extends DeliveryLogGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<DeliveryLogGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof DeliveryLogGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], DeliveryLogGroupByOutputType[P]> : Prisma.GetScalarType<T[P], DeliveryLogGroupByOutputType[P]>;
}>>;
export type DeliveryLogWhereInput = {
    AND?: Prisma.DeliveryLogWhereInput | Prisma.DeliveryLogWhereInput[];
    OR?: Prisma.DeliveryLogWhereInput[];
    NOT?: Prisma.DeliveryLogWhereInput | Prisma.DeliveryLogWhereInput[];
    id?: Prisma.StringFilter<"DeliveryLog"> | string;
    messageId?: Prisma.StringFilter<"DeliveryLog"> | string;
    providerType?: Prisma.StringFilter<"DeliveryLog"> | string;
    status?: Prisma.StringFilter<"DeliveryLog"> | string;
    providerMessageId?: Prisma.StringNullableFilter<"DeliveryLog"> | string | null;
    error?: Prisma.StringNullableFilter<"DeliveryLog"> | string | null;
    tenantId?: Prisma.StringFilter<"DeliveryLog"> | string;
    attempts?: Prisma.IntFilter<"DeliveryLog"> | number;
    createdAt?: Prisma.DateTimeFilter<"DeliveryLog"> | Date | string;
};
export type DeliveryLogOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    messageId?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    providerMessageId?: Prisma.SortOrderInput | Prisma.SortOrder;
    error?: Prisma.SortOrderInput | Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type DeliveryLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.DeliveryLogWhereInput | Prisma.DeliveryLogWhereInput[];
    OR?: Prisma.DeliveryLogWhereInput[];
    NOT?: Prisma.DeliveryLogWhereInput | Prisma.DeliveryLogWhereInput[];
    messageId?: Prisma.StringFilter<"DeliveryLog"> | string;
    providerType?: Prisma.StringFilter<"DeliveryLog"> | string;
    status?: Prisma.StringFilter<"DeliveryLog"> | string;
    providerMessageId?: Prisma.StringNullableFilter<"DeliveryLog"> | string | null;
    error?: Prisma.StringNullableFilter<"DeliveryLog"> | string | null;
    tenantId?: Prisma.StringFilter<"DeliveryLog"> | string;
    attempts?: Prisma.IntFilter<"DeliveryLog"> | number;
    createdAt?: Prisma.DateTimeFilter<"DeliveryLog"> | Date | string;
}, "id">;
export type DeliveryLogOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    messageId?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    providerMessageId?: Prisma.SortOrderInput | Prisma.SortOrder;
    error?: Prisma.SortOrderInput | Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    _count?: Prisma.DeliveryLogCountOrderByAggregateInput;
    _avg?: Prisma.DeliveryLogAvgOrderByAggregateInput;
    _max?: Prisma.DeliveryLogMaxOrderByAggregateInput;
    _min?: Prisma.DeliveryLogMinOrderByAggregateInput;
    _sum?: Prisma.DeliveryLogSumOrderByAggregateInput;
};
export type DeliveryLogScalarWhereWithAggregatesInput = {
    AND?: Prisma.DeliveryLogScalarWhereWithAggregatesInput | Prisma.DeliveryLogScalarWhereWithAggregatesInput[];
    OR?: Prisma.DeliveryLogScalarWhereWithAggregatesInput[];
    NOT?: Prisma.DeliveryLogScalarWhereWithAggregatesInput | Prisma.DeliveryLogScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"DeliveryLog"> | string;
    messageId?: Prisma.StringWithAggregatesFilter<"DeliveryLog"> | string;
    providerType?: Prisma.StringWithAggregatesFilter<"DeliveryLog"> | string;
    status?: Prisma.StringWithAggregatesFilter<"DeliveryLog"> | string;
    providerMessageId?: Prisma.StringNullableWithAggregatesFilter<"DeliveryLog"> | string | null;
    error?: Prisma.StringNullableWithAggregatesFilter<"DeliveryLog"> | string | null;
    tenantId?: Prisma.StringWithAggregatesFilter<"DeliveryLog"> | string;
    attempts?: Prisma.IntWithAggregatesFilter<"DeliveryLog"> | number;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"DeliveryLog"> | Date | string;
};
export type DeliveryLogCreateInput = {
    id: string;
    messageId: string;
    providerType: string;
    status?: string;
    providerMessageId?: string | null;
    error?: string | null;
    tenantId?: string;
    attempts?: number;
    createdAt?: Date | string;
};
export type DeliveryLogUncheckedCreateInput = {
    id: string;
    messageId: string;
    providerType: string;
    status?: string;
    providerMessageId?: string | null;
    error?: string | null;
    tenantId?: string;
    attempts?: number;
    createdAt?: Date | string;
};
export type DeliveryLogUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    messageId?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    providerMessageId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    error?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    tenantId?: Prisma.StringFieldUpdateOperationsInput | string;
    attempts?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type DeliveryLogUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    messageId?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    providerMessageId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    error?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    tenantId?: Prisma.StringFieldUpdateOperationsInput | string;
    attempts?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type DeliveryLogCreateManyInput = {
    id: string;
    messageId: string;
    providerType: string;
    status?: string;
    providerMessageId?: string | null;
    error?: string | null;
    tenantId?: string;
    attempts?: number;
    createdAt?: Date | string;
};
export type DeliveryLogUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    messageId?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    providerMessageId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    error?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    tenantId?: Prisma.StringFieldUpdateOperationsInput | string;
    attempts?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type DeliveryLogUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    messageId?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    providerMessageId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    error?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    tenantId?: Prisma.StringFieldUpdateOperationsInput | string;
    attempts?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type DeliveryLogCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    messageId?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    providerMessageId?: Prisma.SortOrder;
    error?: Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type DeliveryLogAvgOrderByAggregateInput = {
    attempts?: Prisma.SortOrder;
};
export type DeliveryLogMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    messageId?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    providerMessageId?: Prisma.SortOrder;
    error?: Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type DeliveryLogMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    messageId?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    providerMessageId?: Prisma.SortOrder;
    error?: Prisma.SortOrder;
    tenantId?: Prisma.SortOrder;
    attempts?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type DeliveryLogSumOrderByAggregateInput = {
    attempts?: Prisma.SortOrder;
};
export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null;
};
export type IntFieldUpdateOperationsInput = {
    set?: number;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
};
export type DeliveryLogSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    messageId?: boolean;
    providerType?: boolean;
    status?: boolean;
    providerMessageId?: boolean;
    error?: boolean;
    tenantId?: boolean;
    attempts?: boolean;
    createdAt?: boolean;
}, ExtArgs["result"]["deliveryLog"]>;
export type DeliveryLogSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    messageId?: boolean;
    providerType?: boolean;
    status?: boolean;
    providerMessageId?: boolean;
    error?: boolean;
    tenantId?: boolean;
    attempts?: boolean;
    createdAt?: boolean;
}, ExtArgs["result"]["deliveryLog"]>;
export type DeliveryLogSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    messageId?: boolean;
    providerType?: boolean;
    status?: boolean;
    providerMessageId?: boolean;
    error?: boolean;
    tenantId?: boolean;
    attempts?: boolean;
    createdAt?: boolean;
}, ExtArgs["result"]["deliveryLog"]>;
export type DeliveryLogSelectScalar = {
    id?: boolean;
    messageId?: boolean;
    providerType?: boolean;
    status?: boolean;
    providerMessageId?: boolean;
    error?: boolean;
    tenantId?: boolean;
    attempts?: boolean;
    createdAt?: boolean;
};
export type DeliveryLogOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "messageId" | "providerType" | "status" | "providerMessageId" | "error" | "tenantId" | "attempts" | "createdAt", ExtArgs["result"]["deliveryLog"]>;
export type $DeliveryLogPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "DeliveryLog";
    objects: {};
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        messageId: string;
        providerType: string;
        status: string;
        providerMessageId: string | null;
        error: string | null;
        tenantId: string;
        attempts: number;
        createdAt: Date;
    }, ExtArgs["result"]["deliveryLog"]>;
    composites: {};
};
export type DeliveryLogGetPayload<S extends boolean | null | undefined | DeliveryLogDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload, S>;
export type DeliveryLogCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<DeliveryLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: DeliveryLogCountAggregateInputType | true;
};
export interface DeliveryLogDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['DeliveryLog'];
        meta: {
            name: 'DeliveryLog';
        };
    };
    findUnique<T extends DeliveryLogFindUniqueArgs>(args: Prisma.SelectSubset<T, DeliveryLogFindUniqueArgs<ExtArgs>>): Prisma.Prisma__DeliveryLogClient<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends DeliveryLogFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, DeliveryLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__DeliveryLogClient<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends DeliveryLogFindFirstArgs>(args?: Prisma.SelectSubset<T, DeliveryLogFindFirstArgs<ExtArgs>>): Prisma.Prisma__DeliveryLogClient<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends DeliveryLogFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, DeliveryLogFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__DeliveryLogClient<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends DeliveryLogFindManyArgs>(args?: Prisma.SelectSubset<T, DeliveryLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends DeliveryLogCreateArgs>(args: Prisma.SelectSubset<T, DeliveryLogCreateArgs<ExtArgs>>): Prisma.Prisma__DeliveryLogClient<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends DeliveryLogCreateManyArgs>(args?: Prisma.SelectSubset<T, DeliveryLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends DeliveryLogCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, DeliveryLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends DeliveryLogDeleteArgs>(args: Prisma.SelectSubset<T, DeliveryLogDeleteArgs<ExtArgs>>): Prisma.Prisma__DeliveryLogClient<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends DeliveryLogUpdateArgs>(args: Prisma.SelectSubset<T, DeliveryLogUpdateArgs<ExtArgs>>): Prisma.Prisma__DeliveryLogClient<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends DeliveryLogDeleteManyArgs>(args?: Prisma.SelectSubset<T, DeliveryLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends DeliveryLogUpdateManyArgs>(args: Prisma.SelectSubset<T, DeliveryLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends DeliveryLogUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, DeliveryLogUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends DeliveryLogUpsertArgs>(args: Prisma.SelectSubset<T, DeliveryLogUpsertArgs<ExtArgs>>): Prisma.Prisma__DeliveryLogClient<runtime.Types.Result.GetResult<Prisma.$DeliveryLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends DeliveryLogCountArgs>(args?: Prisma.Subset<T, DeliveryLogCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], DeliveryLogCountAggregateOutputType> : number>;
    aggregate<T extends DeliveryLogAggregateArgs>(args: Prisma.Subset<T, DeliveryLogAggregateArgs>): Prisma.PrismaPromise<GetDeliveryLogAggregateType<T>>;
    groupBy<T extends DeliveryLogGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: DeliveryLogGroupByArgs['orderBy'];
    } : {
        orderBy?: DeliveryLogGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, DeliveryLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDeliveryLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: DeliveryLogFieldRefs;
}
export interface Prisma__DeliveryLogClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface DeliveryLogFieldRefs {
    readonly id: Prisma.FieldRef<"DeliveryLog", 'String'>;
    readonly messageId: Prisma.FieldRef<"DeliveryLog", 'String'>;
    readonly providerType: Prisma.FieldRef<"DeliveryLog", 'String'>;
    readonly status: Prisma.FieldRef<"DeliveryLog", 'String'>;
    readonly providerMessageId: Prisma.FieldRef<"DeliveryLog", 'String'>;
    readonly error: Prisma.FieldRef<"DeliveryLog", 'String'>;
    readonly tenantId: Prisma.FieldRef<"DeliveryLog", 'String'>;
    readonly attempts: Prisma.FieldRef<"DeliveryLog", 'Int'>;
    readonly createdAt: Prisma.FieldRef<"DeliveryLog", 'DateTime'>;
}
export type DeliveryLogFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    where: Prisma.DeliveryLogWhereUniqueInput;
};
export type DeliveryLogFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    where: Prisma.DeliveryLogWhereUniqueInput;
};
export type DeliveryLogFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    where?: Prisma.DeliveryLogWhereInput;
    orderBy?: Prisma.DeliveryLogOrderByWithRelationInput | Prisma.DeliveryLogOrderByWithRelationInput[];
    cursor?: Prisma.DeliveryLogWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.DeliveryLogScalarFieldEnum | Prisma.DeliveryLogScalarFieldEnum[];
};
export type DeliveryLogFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    where?: Prisma.DeliveryLogWhereInput;
    orderBy?: Prisma.DeliveryLogOrderByWithRelationInput | Prisma.DeliveryLogOrderByWithRelationInput[];
    cursor?: Prisma.DeliveryLogWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.DeliveryLogScalarFieldEnum | Prisma.DeliveryLogScalarFieldEnum[];
};
export type DeliveryLogFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    where?: Prisma.DeliveryLogWhereInput;
    orderBy?: Prisma.DeliveryLogOrderByWithRelationInput | Prisma.DeliveryLogOrderByWithRelationInput[];
    cursor?: Prisma.DeliveryLogWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.DeliveryLogScalarFieldEnum | Prisma.DeliveryLogScalarFieldEnum[];
};
export type DeliveryLogCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.DeliveryLogCreateInput, Prisma.DeliveryLogUncheckedCreateInput>;
};
export type DeliveryLogCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.DeliveryLogCreateManyInput | Prisma.DeliveryLogCreateManyInput[];
    skipDuplicates?: boolean;
};
export type DeliveryLogCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    data: Prisma.DeliveryLogCreateManyInput | Prisma.DeliveryLogCreateManyInput[];
    skipDuplicates?: boolean;
};
export type DeliveryLogUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.DeliveryLogUpdateInput, Prisma.DeliveryLogUncheckedUpdateInput>;
    where: Prisma.DeliveryLogWhereUniqueInput;
};
export type DeliveryLogUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.DeliveryLogUpdateManyMutationInput, Prisma.DeliveryLogUncheckedUpdateManyInput>;
    where?: Prisma.DeliveryLogWhereInput;
    limit?: number;
};
export type DeliveryLogUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.DeliveryLogUpdateManyMutationInput, Prisma.DeliveryLogUncheckedUpdateManyInput>;
    where?: Prisma.DeliveryLogWhereInput;
    limit?: number;
};
export type DeliveryLogUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    where: Prisma.DeliveryLogWhereUniqueInput;
    create: Prisma.XOR<Prisma.DeliveryLogCreateInput, Prisma.DeliveryLogUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.DeliveryLogUpdateInput, Prisma.DeliveryLogUncheckedUpdateInput>;
};
export type DeliveryLogDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
    where: Prisma.DeliveryLogWhereUniqueInput;
};
export type DeliveryLogDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.DeliveryLogWhereInput;
    limit?: number;
};
export type DeliveryLogDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.DeliveryLogSelect<ExtArgs> | null;
    omit?: Prisma.DeliveryLogOmit<ExtArgs> | null;
};

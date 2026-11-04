import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type ProviderConnectionModel = runtime.Types.Result.DefaultSelection<Prisma.$ProviderConnectionPayload>;
export type AggregateProviderConnection = {
    _count: ProviderConnectionCountAggregateOutputType | null;
    _min: ProviderConnectionMinAggregateOutputType | null;
    _max: ProviderConnectionMaxAggregateOutputType | null;
};
export type ProviderConnectionMinAggregateOutputType = {
    id: string | null;
    providerType: string | null;
    status: string | null;
    connectedAt: Date | null;
    updatedAt: Date | null;
};
export type ProviderConnectionMaxAggregateOutputType = {
    id: string | null;
    providerType: string | null;
    status: string | null;
    connectedAt: Date | null;
    updatedAt: Date | null;
};
export type ProviderConnectionCountAggregateOutputType = {
    id: number;
    providerType: number;
    status: number;
    details: number;
    connectedAt: number;
    updatedAt: number;
    _all: number;
};
export type ProviderConnectionMinAggregateInputType = {
    id?: true;
    providerType?: true;
    status?: true;
    connectedAt?: true;
    updatedAt?: true;
};
export type ProviderConnectionMaxAggregateInputType = {
    id?: true;
    providerType?: true;
    status?: true;
    connectedAt?: true;
    updatedAt?: true;
};
export type ProviderConnectionCountAggregateInputType = {
    id?: true;
    providerType?: true;
    status?: true;
    details?: true;
    connectedAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type ProviderConnectionAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ProviderConnectionWhereInput;
    orderBy?: Prisma.ProviderConnectionOrderByWithRelationInput | Prisma.ProviderConnectionOrderByWithRelationInput[];
    cursor?: Prisma.ProviderConnectionWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | ProviderConnectionCountAggregateInputType;
    _min?: ProviderConnectionMinAggregateInputType;
    _max?: ProviderConnectionMaxAggregateInputType;
};
export type GetProviderConnectionAggregateType<T extends ProviderConnectionAggregateArgs> = {
    [P in keyof T & keyof AggregateProviderConnection]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateProviderConnection[P]> : Prisma.GetScalarType<T[P], AggregateProviderConnection[P]>;
};
export type ProviderConnectionGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ProviderConnectionWhereInput;
    orderBy?: Prisma.ProviderConnectionOrderByWithAggregationInput | Prisma.ProviderConnectionOrderByWithAggregationInput[];
    by: Prisma.ProviderConnectionScalarFieldEnum[] | Prisma.ProviderConnectionScalarFieldEnum;
    having?: Prisma.ProviderConnectionScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: ProviderConnectionCountAggregateInputType | true;
    _min?: ProviderConnectionMinAggregateInputType;
    _max?: ProviderConnectionMaxAggregateInputType;
};
export type ProviderConnectionGroupByOutputType = {
    id: string;
    providerType: string;
    status: string;
    details: runtime.JsonValue | null;
    connectedAt: Date | null;
    updatedAt: Date;
    _count: ProviderConnectionCountAggregateOutputType | null;
    _min: ProviderConnectionMinAggregateOutputType | null;
    _max: ProviderConnectionMaxAggregateOutputType | null;
};
export type GetProviderConnectionGroupByPayload<T extends ProviderConnectionGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<ProviderConnectionGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof ProviderConnectionGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], ProviderConnectionGroupByOutputType[P]> : Prisma.GetScalarType<T[P], ProviderConnectionGroupByOutputType[P]>;
}>>;
export type ProviderConnectionWhereInput = {
    AND?: Prisma.ProviderConnectionWhereInput | Prisma.ProviderConnectionWhereInput[];
    OR?: Prisma.ProviderConnectionWhereInput[];
    NOT?: Prisma.ProviderConnectionWhereInput | Prisma.ProviderConnectionWhereInput[];
    id?: Prisma.StringFilter<"ProviderConnection"> | string;
    providerType?: Prisma.StringFilter<"ProviderConnection"> | string;
    status?: Prisma.StringFilter<"ProviderConnection"> | string;
    details?: Prisma.JsonNullableFilter<"ProviderConnection">;
    connectedAt?: Prisma.DateTimeNullableFilter<"ProviderConnection"> | Date | string | null;
    updatedAt?: Prisma.DateTimeFilter<"ProviderConnection"> | Date | string;
};
export type ProviderConnectionOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    details?: Prisma.SortOrderInput | Prisma.SortOrder;
    connectedAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ProviderConnectionWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.ProviderConnectionWhereInput | Prisma.ProviderConnectionWhereInput[];
    OR?: Prisma.ProviderConnectionWhereInput[];
    NOT?: Prisma.ProviderConnectionWhereInput | Prisma.ProviderConnectionWhereInput[];
    providerType?: Prisma.StringFilter<"ProviderConnection"> | string;
    status?: Prisma.StringFilter<"ProviderConnection"> | string;
    details?: Prisma.JsonNullableFilter<"ProviderConnection">;
    connectedAt?: Prisma.DateTimeNullableFilter<"ProviderConnection"> | Date | string | null;
    updatedAt?: Prisma.DateTimeFilter<"ProviderConnection"> | Date | string;
}, "id">;
export type ProviderConnectionOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    details?: Prisma.SortOrderInput | Prisma.SortOrder;
    connectedAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.ProviderConnectionCountOrderByAggregateInput;
    _max?: Prisma.ProviderConnectionMaxOrderByAggregateInput;
    _min?: Prisma.ProviderConnectionMinOrderByAggregateInput;
};
export type ProviderConnectionScalarWhereWithAggregatesInput = {
    AND?: Prisma.ProviderConnectionScalarWhereWithAggregatesInput | Prisma.ProviderConnectionScalarWhereWithAggregatesInput[];
    OR?: Prisma.ProviderConnectionScalarWhereWithAggregatesInput[];
    NOT?: Prisma.ProviderConnectionScalarWhereWithAggregatesInput | Prisma.ProviderConnectionScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"ProviderConnection"> | string;
    providerType?: Prisma.StringWithAggregatesFilter<"ProviderConnection"> | string;
    status?: Prisma.StringWithAggregatesFilter<"ProviderConnection"> | string;
    details?: Prisma.JsonNullableWithAggregatesFilter<"ProviderConnection">;
    connectedAt?: Prisma.DateTimeNullableWithAggregatesFilter<"ProviderConnection"> | Date | string | null;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"ProviderConnection"> | Date | string;
};
export type ProviderConnectionCreateInput = {
    id: string;
    providerType: string;
    status?: string;
    details?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    connectedAt?: Date | string | null;
    updatedAt?: Date | string;
};
export type ProviderConnectionUncheckedCreateInput = {
    id: string;
    providerType: string;
    status?: string;
    details?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    connectedAt?: Date | string | null;
    updatedAt?: Date | string;
};
export type ProviderConnectionUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    details?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    connectedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ProviderConnectionUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    details?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    connectedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ProviderConnectionCreateManyInput = {
    id: string;
    providerType: string;
    status?: string;
    details?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    connectedAt?: Date | string | null;
    updatedAt?: Date | string;
};
export type ProviderConnectionUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    details?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    connectedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ProviderConnectionUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    details?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    connectedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ProviderConnectionCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    details?: Prisma.SortOrder;
    connectedAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ProviderConnectionMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    connectedAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ProviderConnectionMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    connectedAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null;
};
export type ProviderConnectionSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    providerType?: boolean;
    status?: boolean;
    details?: boolean;
    connectedAt?: boolean;
    updatedAt?: boolean;
}, ExtArgs["result"]["providerConnection"]>;
export type ProviderConnectionSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    providerType?: boolean;
    status?: boolean;
    details?: boolean;
    connectedAt?: boolean;
    updatedAt?: boolean;
}, ExtArgs["result"]["providerConnection"]>;
export type ProviderConnectionSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    providerType?: boolean;
    status?: boolean;
    details?: boolean;
    connectedAt?: boolean;
    updatedAt?: boolean;
}, ExtArgs["result"]["providerConnection"]>;
export type ProviderConnectionSelectScalar = {
    id?: boolean;
    providerType?: boolean;
    status?: boolean;
    details?: boolean;
    connectedAt?: boolean;
    updatedAt?: boolean;
};
export type ProviderConnectionOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "providerType" | "status" | "details" | "connectedAt" | "updatedAt", ExtArgs["result"]["providerConnection"]>;
export type $ProviderConnectionPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "ProviderConnection";
    objects: {};
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        providerType: string;
        status: string;
        details: runtime.JsonValue | null;
        connectedAt: Date | null;
        updatedAt: Date;
    }, ExtArgs["result"]["providerConnection"]>;
    composites: {};
};
export type ProviderConnectionGetPayload<S extends boolean | null | undefined | ProviderConnectionDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload, S>;
export type ProviderConnectionCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<ProviderConnectionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: ProviderConnectionCountAggregateInputType | true;
};
export interface ProviderConnectionDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['ProviderConnection'];
        meta: {
            name: 'ProviderConnection';
        };
    };
    findUnique<T extends ProviderConnectionFindUniqueArgs>(args: Prisma.SelectSubset<T, ProviderConnectionFindUniqueArgs<ExtArgs>>): Prisma.Prisma__ProviderConnectionClient<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends ProviderConnectionFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, ProviderConnectionFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__ProviderConnectionClient<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends ProviderConnectionFindFirstArgs>(args?: Prisma.SelectSubset<T, ProviderConnectionFindFirstArgs<ExtArgs>>): Prisma.Prisma__ProviderConnectionClient<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends ProviderConnectionFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, ProviderConnectionFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__ProviderConnectionClient<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends ProviderConnectionFindManyArgs>(args?: Prisma.SelectSubset<T, ProviderConnectionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends ProviderConnectionCreateArgs>(args: Prisma.SelectSubset<T, ProviderConnectionCreateArgs<ExtArgs>>): Prisma.Prisma__ProviderConnectionClient<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends ProviderConnectionCreateManyArgs>(args?: Prisma.SelectSubset<T, ProviderConnectionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends ProviderConnectionCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, ProviderConnectionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends ProviderConnectionDeleteArgs>(args: Prisma.SelectSubset<T, ProviderConnectionDeleteArgs<ExtArgs>>): Prisma.Prisma__ProviderConnectionClient<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends ProviderConnectionUpdateArgs>(args: Prisma.SelectSubset<T, ProviderConnectionUpdateArgs<ExtArgs>>): Prisma.Prisma__ProviderConnectionClient<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends ProviderConnectionDeleteManyArgs>(args?: Prisma.SelectSubset<T, ProviderConnectionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends ProviderConnectionUpdateManyArgs>(args: Prisma.SelectSubset<T, ProviderConnectionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends ProviderConnectionUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, ProviderConnectionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends ProviderConnectionUpsertArgs>(args: Prisma.SelectSubset<T, ProviderConnectionUpsertArgs<ExtArgs>>): Prisma.Prisma__ProviderConnectionClient<runtime.Types.Result.GetResult<Prisma.$ProviderConnectionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends ProviderConnectionCountArgs>(args?: Prisma.Subset<T, ProviderConnectionCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], ProviderConnectionCountAggregateOutputType> : number>;
    aggregate<T extends ProviderConnectionAggregateArgs>(args: Prisma.Subset<T, ProviderConnectionAggregateArgs>): Prisma.PrismaPromise<GetProviderConnectionAggregateType<T>>;
    groupBy<T extends ProviderConnectionGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: ProviderConnectionGroupByArgs['orderBy'];
    } : {
        orderBy?: ProviderConnectionGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, ProviderConnectionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProviderConnectionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: ProviderConnectionFieldRefs;
}
export interface Prisma__ProviderConnectionClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface ProviderConnectionFieldRefs {
    readonly id: Prisma.FieldRef<"ProviderConnection", 'String'>;
    readonly providerType: Prisma.FieldRef<"ProviderConnection", 'String'>;
    readonly status: Prisma.FieldRef<"ProviderConnection", 'String'>;
    readonly details: Prisma.FieldRef<"ProviderConnection", 'Json'>;
    readonly connectedAt: Prisma.FieldRef<"ProviderConnection", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"ProviderConnection", 'DateTime'>;
}
export type ProviderConnectionFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    where: Prisma.ProviderConnectionWhereUniqueInput;
};
export type ProviderConnectionFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    where: Prisma.ProviderConnectionWhereUniqueInput;
};
export type ProviderConnectionFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    where?: Prisma.ProviderConnectionWhereInput;
    orderBy?: Prisma.ProviderConnectionOrderByWithRelationInput | Prisma.ProviderConnectionOrderByWithRelationInput[];
    cursor?: Prisma.ProviderConnectionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ProviderConnectionScalarFieldEnum | Prisma.ProviderConnectionScalarFieldEnum[];
};
export type ProviderConnectionFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    where?: Prisma.ProviderConnectionWhereInput;
    orderBy?: Prisma.ProviderConnectionOrderByWithRelationInput | Prisma.ProviderConnectionOrderByWithRelationInput[];
    cursor?: Prisma.ProviderConnectionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ProviderConnectionScalarFieldEnum | Prisma.ProviderConnectionScalarFieldEnum[];
};
export type ProviderConnectionFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    where?: Prisma.ProviderConnectionWhereInput;
    orderBy?: Prisma.ProviderConnectionOrderByWithRelationInput | Prisma.ProviderConnectionOrderByWithRelationInput[];
    cursor?: Prisma.ProviderConnectionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ProviderConnectionScalarFieldEnum | Prisma.ProviderConnectionScalarFieldEnum[];
};
export type ProviderConnectionCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ProviderConnectionCreateInput, Prisma.ProviderConnectionUncheckedCreateInput>;
};
export type ProviderConnectionCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.ProviderConnectionCreateManyInput | Prisma.ProviderConnectionCreateManyInput[];
    skipDuplicates?: boolean;
};
export type ProviderConnectionCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    data: Prisma.ProviderConnectionCreateManyInput | Prisma.ProviderConnectionCreateManyInput[];
    skipDuplicates?: boolean;
};
export type ProviderConnectionUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ProviderConnectionUpdateInput, Prisma.ProviderConnectionUncheckedUpdateInput>;
    where: Prisma.ProviderConnectionWhereUniqueInput;
};
export type ProviderConnectionUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.ProviderConnectionUpdateManyMutationInput, Prisma.ProviderConnectionUncheckedUpdateManyInput>;
    where?: Prisma.ProviderConnectionWhereInput;
    limit?: number;
};
export type ProviderConnectionUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ProviderConnectionUpdateManyMutationInput, Prisma.ProviderConnectionUncheckedUpdateManyInput>;
    where?: Prisma.ProviderConnectionWhereInput;
    limit?: number;
};
export type ProviderConnectionUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    where: Prisma.ProviderConnectionWhereUniqueInput;
    create: Prisma.XOR<Prisma.ProviderConnectionCreateInput, Prisma.ProviderConnectionUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.ProviderConnectionUpdateInput, Prisma.ProviderConnectionUncheckedUpdateInput>;
};
export type ProviderConnectionDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
    where: Prisma.ProviderConnectionWhereUniqueInput;
};
export type ProviderConnectionDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ProviderConnectionWhereInput;
    limit?: number;
};
export type ProviderConnectionDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConnectionSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConnectionOmit<ExtArgs> | null;
};

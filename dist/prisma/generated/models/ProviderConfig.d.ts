import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type ProviderConfigModel = runtime.Types.Result.DefaultSelection<Prisma.$ProviderConfigPayload>;
export type AggregateProviderConfig = {
    _count: ProviderConfigCountAggregateOutputType | null;
    _min: ProviderConfigMinAggregateOutputType | null;
    _max: ProviderConfigMaxAggregateOutputType | null;
};
export type ProviderConfigMinAggregateOutputType = {
    id: string | null;
    providerType: string | null;
    enabled: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type ProviderConfigMaxAggregateOutputType = {
    id: string | null;
    providerType: string | null;
    enabled: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type ProviderConfigCountAggregateOutputType = {
    id: number;
    providerType: number;
    enabled: number;
    settings: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
};
export type ProviderConfigMinAggregateInputType = {
    id?: true;
    providerType?: true;
    enabled?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type ProviderConfigMaxAggregateInputType = {
    id?: true;
    providerType?: true;
    enabled?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type ProviderConfigCountAggregateInputType = {
    id?: true;
    providerType?: true;
    enabled?: true;
    settings?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type ProviderConfigAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ProviderConfigWhereInput;
    orderBy?: Prisma.ProviderConfigOrderByWithRelationInput | Prisma.ProviderConfigOrderByWithRelationInput[];
    cursor?: Prisma.ProviderConfigWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | ProviderConfigCountAggregateInputType;
    _min?: ProviderConfigMinAggregateInputType;
    _max?: ProviderConfigMaxAggregateInputType;
};
export type GetProviderConfigAggregateType<T extends ProviderConfigAggregateArgs> = {
    [P in keyof T & keyof AggregateProviderConfig]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateProviderConfig[P]> : Prisma.GetScalarType<T[P], AggregateProviderConfig[P]>;
};
export type ProviderConfigGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ProviderConfigWhereInput;
    orderBy?: Prisma.ProviderConfigOrderByWithAggregationInput | Prisma.ProviderConfigOrderByWithAggregationInput[];
    by: Prisma.ProviderConfigScalarFieldEnum[] | Prisma.ProviderConfigScalarFieldEnum;
    having?: Prisma.ProviderConfigScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: ProviderConfigCountAggregateInputType | true;
    _min?: ProviderConfigMinAggregateInputType;
    _max?: ProviderConfigMaxAggregateInputType;
};
export type ProviderConfigGroupByOutputType = {
    id: string;
    providerType: string;
    enabled: boolean;
    settings: runtime.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    _count: ProviderConfigCountAggregateOutputType | null;
    _min: ProviderConfigMinAggregateOutputType | null;
    _max: ProviderConfigMaxAggregateOutputType | null;
};
export type GetProviderConfigGroupByPayload<T extends ProviderConfigGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<ProviderConfigGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof ProviderConfigGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], ProviderConfigGroupByOutputType[P]> : Prisma.GetScalarType<T[P], ProviderConfigGroupByOutputType[P]>;
}>>;
export type ProviderConfigWhereInput = {
    AND?: Prisma.ProviderConfigWhereInput | Prisma.ProviderConfigWhereInput[];
    OR?: Prisma.ProviderConfigWhereInput[];
    NOT?: Prisma.ProviderConfigWhereInput | Prisma.ProviderConfigWhereInput[];
    id?: Prisma.StringFilter<"ProviderConfig"> | string;
    providerType?: Prisma.StringFilter<"ProviderConfig"> | string;
    enabled?: Prisma.BoolFilter<"ProviderConfig"> | boolean;
    settings?: Prisma.JsonNullableFilter<"ProviderConfig">;
    createdAt?: Prisma.DateTimeFilter<"ProviderConfig"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"ProviderConfig"> | Date | string;
};
export type ProviderConfigOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    enabled?: Prisma.SortOrder;
    settings?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ProviderConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    providerType?: string;
    AND?: Prisma.ProviderConfigWhereInput | Prisma.ProviderConfigWhereInput[];
    OR?: Prisma.ProviderConfigWhereInput[];
    NOT?: Prisma.ProviderConfigWhereInput | Prisma.ProviderConfigWhereInput[];
    enabled?: Prisma.BoolFilter<"ProviderConfig"> | boolean;
    settings?: Prisma.JsonNullableFilter<"ProviderConfig">;
    createdAt?: Prisma.DateTimeFilter<"ProviderConfig"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"ProviderConfig"> | Date | string;
}, "id" | "providerType">;
export type ProviderConfigOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    enabled?: Prisma.SortOrder;
    settings?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.ProviderConfigCountOrderByAggregateInput;
    _max?: Prisma.ProviderConfigMaxOrderByAggregateInput;
    _min?: Prisma.ProviderConfigMinOrderByAggregateInput;
};
export type ProviderConfigScalarWhereWithAggregatesInput = {
    AND?: Prisma.ProviderConfigScalarWhereWithAggregatesInput | Prisma.ProviderConfigScalarWhereWithAggregatesInput[];
    OR?: Prisma.ProviderConfigScalarWhereWithAggregatesInput[];
    NOT?: Prisma.ProviderConfigScalarWhereWithAggregatesInput | Prisma.ProviderConfigScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"ProviderConfig"> | string;
    providerType?: Prisma.StringWithAggregatesFilter<"ProviderConfig"> | string;
    enabled?: Prisma.BoolWithAggregatesFilter<"ProviderConfig"> | boolean;
    settings?: Prisma.JsonNullableWithAggregatesFilter<"ProviderConfig">;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"ProviderConfig"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"ProviderConfig"> | Date | string;
};
export type ProviderConfigCreateInput = {
    id: string;
    providerType: string;
    enabled?: boolean;
    settings?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ProviderConfigUncheckedCreateInput = {
    id: string;
    providerType: string;
    enabled?: boolean;
    settings?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ProviderConfigUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    enabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    settings?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ProviderConfigUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    enabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    settings?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ProviderConfigCreateManyInput = {
    id: string;
    providerType: string;
    enabled?: boolean;
    settings?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type ProviderConfigUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    enabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    settings?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ProviderConfigUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    providerType?: Prisma.StringFieldUpdateOperationsInput | string;
    enabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    settings?: Prisma.NullableJsonNullValueInput | runtime.InputJsonValue;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type ProviderConfigCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    enabled?: Prisma.SortOrder;
    settings?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ProviderConfigMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    enabled?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type ProviderConfigMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    providerType?: Prisma.SortOrder;
    enabled?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type StringFieldUpdateOperationsInput = {
    set?: string;
};
export type BoolFieldUpdateOperationsInput = {
    set?: boolean;
};
export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string;
};
export type ProviderConfigSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    providerType?: boolean;
    enabled?: boolean;
    settings?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
}, ExtArgs["result"]["providerConfig"]>;
export type ProviderConfigSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    providerType?: boolean;
    enabled?: boolean;
    settings?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
}, ExtArgs["result"]["providerConfig"]>;
export type ProviderConfigSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    providerType?: boolean;
    enabled?: boolean;
    settings?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
}, ExtArgs["result"]["providerConfig"]>;
export type ProviderConfigSelectScalar = {
    id?: boolean;
    providerType?: boolean;
    enabled?: boolean;
    settings?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};
export type ProviderConfigOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "providerType" | "enabled" | "settings" | "createdAt" | "updatedAt", ExtArgs["result"]["providerConfig"]>;
export type $ProviderConfigPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "ProviderConfig";
    objects: {};
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        providerType: string;
        enabled: boolean;
        settings: runtime.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    }, ExtArgs["result"]["providerConfig"]>;
    composites: {};
};
export type ProviderConfigGetPayload<S extends boolean | null | undefined | ProviderConfigDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload, S>;
export type ProviderConfigCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<ProviderConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: ProviderConfigCountAggregateInputType | true;
};
export interface ProviderConfigDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['ProviderConfig'];
        meta: {
            name: 'ProviderConfig';
        };
    };
    findUnique<T extends ProviderConfigFindUniqueArgs>(args: Prisma.SelectSubset<T, ProviderConfigFindUniqueArgs<ExtArgs>>): Prisma.Prisma__ProviderConfigClient<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends ProviderConfigFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, ProviderConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__ProviderConfigClient<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends ProviderConfigFindFirstArgs>(args?: Prisma.SelectSubset<T, ProviderConfigFindFirstArgs<ExtArgs>>): Prisma.Prisma__ProviderConfigClient<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends ProviderConfigFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, ProviderConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__ProviderConfigClient<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends ProviderConfigFindManyArgs>(args?: Prisma.SelectSubset<T, ProviderConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends ProviderConfigCreateArgs>(args: Prisma.SelectSubset<T, ProviderConfigCreateArgs<ExtArgs>>): Prisma.Prisma__ProviderConfigClient<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends ProviderConfigCreateManyArgs>(args?: Prisma.SelectSubset<T, ProviderConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends ProviderConfigCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, ProviderConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends ProviderConfigDeleteArgs>(args: Prisma.SelectSubset<T, ProviderConfigDeleteArgs<ExtArgs>>): Prisma.Prisma__ProviderConfigClient<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends ProviderConfigUpdateArgs>(args: Prisma.SelectSubset<T, ProviderConfigUpdateArgs<ExtArgs>>): Prisma.Prisma__ProviderConfigClient<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends ProviderConfigDeleteManyArgs>(args?: Prisma.SelectSubset<T, ProviderConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends ProviderConfigUpdateManyArgs>(args: Prisma.SelectSubset<T, ProviderConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends ProviderConfigUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, ProviderConfigUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends ProviderConfigUpsertArgs>(args: Prisma.SelectSubset<T, ProviderConfigUpsertArgs<ExtArgs>>): Prisma.Prisma__ProviderConfigClient<runtime.Types.Result.GetResult<Prisma.$ProviderConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends ProviderConfigCountArgs>(args?: Prisma.Subset<T, ProviderConfigCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], ProviderConfigCountAggregateOutputType> : number>;
    aggregate<T extends ProviderConfigAggregateArgs>(args: Prisma.Subset<T, ProviderConfigAggregateArgs>): Prisma.PrismaPromise<GetProviderConfigAggregateType<T>>;
    groupBy<T extends ProviderConfigGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: ProviderConfigGroupByArgs['orderBy'];
    } : {
        orderBy?: ProviderConfigGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, ProviderConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProviderConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: ProviderConfigFieldRefs;
}
export interface Prisma__ProviderConfigClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface ProviderConfigFieldRefs {
    readonly id: Prisma.FieldRef<"ProviderConfig", 'String'>;
    readonly providerType: Prisma.FieldRef<"ProviderConfig", 'String'>;
    readonly enabled: Prisma.FieldRef<"ProviderConfig", 'Boolean'>;
    readonly settings: Prisma.FieldRef<"ProviderConfig", 'Json'>;
    readonly createdAt: Prisma.FieldRef<"ProviderConfig", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"ProviderConfig", 'DateTime'>;
}
export type ProviderConfigFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    where: Prisma.ProviderConfigWhereUniqueInput;
};
export type ProviderConfigFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    where: Prisma.ProviderConfigWhereUniqueInput;
};
export type ProviderConfigFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    where?: Prisma.ProviderConfigWhereInput;
    orderBy?: Prisma.ProviderConfigOrderByWithRelationInput | Prisma.ProviderConfigOrderByWithRelationInput[];
    cursor?: Prisma.ProviderConfigWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ProviderConfigScalarFieldEnum | Prisma.ProviderConfigScalarFieldEnum[];
};
export type ProviderConfigFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    where?: Prisma.ProviderConfigWhereInput;
    orderBy?: Prisma.ProviderConfigOrderByWithRelationInput | Prisma.ProviderConfigOrderByWithRelationInput[];
    cursor?: Prisma.ProviderConfigWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ProviderConfigScalarFieldEnum | Prisma.ProviderConfigScalarFieldEnum[];
};
export type ProviderConfigFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    where?: Prisma.ProviderConfigWhereInput;
    orderBy?: Prisma.ProviderConfigOrderByWithRelationInput | Prisma.ProviderConfigOrderByWithRelationInput[];
    cursor?: Prisma.ProviderConfigWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.ProviderConfigScalarFieldEnum | Prisma.ProviderConfigScalarFieldEnum[];
};
export type ProviderConfigCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ProviderConfigCreateInput, Prisma.ProviderConfigUncheckedCreateInput>;
};
export type ProviderConfigCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.ProviderConfigCreateManyInput | Prisma.ProviderConfigCreateManyInput[];
    skipDuplicates?: boolean;
};
export type ProviderConfigCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    data: Prisma.ProviderConfigCreateManyInput | Prisma.ProviderConfigCreateManyInput[];
    skipDuplicates?: boolean;
};
export type ProviderConfigUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ProviderConfigUpdateInput, Prisma.ProviderConfigUncheckedUpdateInput>;
    where: Prisma.ProviderConfigWhereUniqueInput;
};
export type ProviderConfigUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.ProviderConfigUpdateManyMutationInput, Prisma.ProviderConfigUncheckedUpdateManyInput>;
    where?: Prisma.ProviderConfigWhereInput;
    limit?: number;
};
export type ProviderConfigUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.ProviderConfigUpdateManyMutationInput, Prisma.ProviderConfigUncheckedUpdateManyInput>;
    where?: Prisma.ProviderConfigWhereInput;
    limit?: number;
};
export type ProviderConfigUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    where: Prisma.ProviderConfigWhereUniqueInput;
    create: Prisma.XOR<Prisma.ProviderConfigCreateInput, Prisma.ProviderConfigUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.ProviderConfigUpdateInput, Prisma.ProviderConfigUncheckedUpdateInput>;
};
export type ProviderConfigDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
    where: Prisma.ProviderConfigWhereUniqueInput;
};
export type ProviderConfigDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.ProviderConfigWhereInput;
    limit?: number;
};
export type ProviderConfigDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.ProviderConfigSelect<ExtArgs> | null;
    omit?: Prisma.ProviderConfigOmit<ExtArgs> | null;
};

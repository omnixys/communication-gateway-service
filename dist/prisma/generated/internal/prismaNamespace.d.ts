import * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../models.js";
import { type PrismaClient } from "./class.js";
export type * from '../models.js';
export type DMMF = typeof runtime.DMMF;
export type PrismaPromise<T> = runtime.Types.Public.PrismaPromise<T>;
export declare const PrismaClientKnownRequestError: typeof runtime.PrismaClientKnownRequestError;
export type PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError;
export declare const PrismaClientUnknownRequestError: typeof runtime.PrismaClientUnknownRequestError;
export type PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError;
export declare const PrismaClientRustPanicError: typeof runtime.PrismaClientRustPanicError;
export type PrismaClientRustPanicError = runtime.PrismaClientRustPanicError;
export declare const PrismaClientInitializationError: typeof runtime.PrismaClientInitializationError;
export type PrismaClientInitializationError = runtime.PrismaClientInitializationError;
export declare const PrismaClientValidationError: typeof runtime.PrismaClientValidationError;
export type PrismaClientValidationError = runtime.PrismaClientValidationError;
export declare const sql: typeof runtime.sqltag;
export declare const empty: runtime.Sql;
export declare const join: typeof runtime.join;
export declare const raw: typeof runtime.raw;
export declare const Sql: typeof runtime.Sql;
export type Sql = runtime.Sql;
export declare const Decimal: typeof runtime.Decimal;
export type Decimal = runtime.Decimal;
export type DecimalJsLike = runtime.DecimalJsLike;
export type Extension = runtime.Types.Extensions.UserArgs;
export declare const getExtensionContext: typeof runtime.Extensions.getExtensionContext;
export type Args<T, F extends runtime.Operation> = runtime.Types.Public.Args<T, F>;
export type Payload<T, F extends runtime.Operation = never> = runtime.Types.Public.Payload<T, F>;
export type Result<T, A, F extends runtime.Operation> = runtime.Types.Public.Result<T, A, F>;
export type Exact<A, W> = runtime.Types.Public.Exact<A, W>;
export type PrismaVersion = {
    client: string;
    engine: string;
};
export declare const prismaVersion: PrismaVersion;
export type Bytes = runtime.Bytes;
export type JsonObject = runtime.JsonObject;
export type JsonArray = runtime.JsonArray;
export type JsonValue = runtime.JsonValue;
export type InputJsonObject = runtime.InputJsonObject;
export type InputJsonArray = runtime.InputJsonArray;
export type InputJsonValue = runtime.InputJsonValue;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
export declare const DbNull: runtime.DbNullClass;
export declare const JsonNull: runtime.JsonNullClass;
export declare const AnyNull: runtime.AnyNullClass;
type SelectAndInclude = {
    select: any;
    include: any;
};
type SelectAndOmit = {
    select: any;
    omit: any;
};
type Prisma__Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};
export type Enumerable<T> = T | Array<T>;
export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
};
export type PrismaClientConstructorArgs<Options extends PrismaClientOptions> = [
    PrismaClientOptions
] extends [Options] ? PrismaClientOptions : Subset<Options, PrismaClientOptions>;
export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
} & (T extends SelectAndInclude ? 'Please either choose `select` or `include`.' : T extends SelectAndOmit ? 'Please either choose `select` or `omit`.' : {});
export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
} & K;
type Without<T, U> = {
    [P in Exclude<keyof T, keyof U>]?: never;
};
export type XOR<T, U> = T extends object ? U extends object ? ((Without<T, U> & U) | (Without<U, T> & T)) & object : U : T;
type IsObject<T extends any> = T extends Array<any> ? False : T extends Date ? False : T extends Uint8Array ? False : T extends BigInt ? False : T extends object ? True : False;
export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T;
type __Either<O extends object, K extends Key> = Omit<O, K> & {
    [P in K]: Prisma__Pick<O, P & keyof O>;
}[K];
type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>;
type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>;
type _Either<O extends object, K extends Key, strict extends Boolean> = {
    1: EitherStrict<O, K>;
    0: EitherLoose<O, K>;
}[strict];
export type Either<O extends object, K extends Key, strict extends Boolean = 1> = O extends unknown ? _Either<O, K, strict> : never;
export type Union = any;
export type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K];
} & {};
export type IntersectOf<U extends Union> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type Overwrite<O extends object, O1 extends object> = {
    [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
} & {};
type _Merge<U extends object> = IntersectOf<Overwrite<U, {
    [K in keyof U]-?: At<U, K>;
}>>;
type Key = string | number | symbol;
type AtStrict<O extends object, K extends Key> = O[K & keyof O];
type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
    1: AtStrict<O, K>;
    0: AtLoose<O, K>;
}[strict];
export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
} & {};
export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
} & {};
type _Record<K extends keyof any, T> = {
    [P in K]: T;
};
type NoExpand<T> = T extends unknown ? T : never;
export type AtLeast<O extends object, K extends string> = NoExpand<O extends unknown ? (K extends keyof O ? {
    [P in K]: O[P];
} & O : O) | {
    [P in keyof O as P extends K ? P : never]-?: O[P];
} & O : never>;
type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;
export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;
export type Boolean = True | False;
export type True = 1;
export type False = 0;
export type Not<B extends Boolean> = {
    0: 1;
    1: 0;
}[B];
export type Extends<A1 extends any, A2 extends any> = [A1] extends [never] ? 0 : A1 extends A2 ? 1 : 0;
export type Has<U extends Union, U1 extends Union> = Not<Extends<Exclude<U1, U>, U1>>;
export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
        0: 0;
        1: 1;
    };
    1: {
        0: 1;
        1: 1;
    };
}[B1][B2];
export type Keys<U extends Union> = U extends unknown ? keyof U : never;
export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O ? O[P] : never;
} : never;
type FieldPaths<T, U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>> = IsObject<T> extends True ? U : T;
export type GetHavingFields<T> = {
    [K in keyof T]: Or<Or<Extends<'OR', K>, Extends<'AND', K>>, Extends<'NOT', K>> extends True ? T[K] extends infer TK ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never> : never : {} extends FieldPaths<T[K]> ? never : K;
}[keyof T];
type _TupleToUnion<T> = T extends (infer E)[] ? E : never;
type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>;
export type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T;
export type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>;
export type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T;
export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>;
type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>;
export declare const ModelName: {
    readonly ProviderConfig: "ProviderConfig";
    readonly ProviderConnection: "ProviderConnection";
    readonly DeliveryLog: "DeliveryLog";
    readonly MessageMapping: "MessageMapping";
    readonly AnalyticsOutbox: "AnalyticsOutbox";
};
export type ModelName = (typeof ModelName)[keyof typeof ModelName];
export interface TypeMapCb<GlobalOmitOptions = {}> extends runtime.Types.Utils.Fn<{
    extArgs: runtime.Types.Extensions.InternalArgs;
}, runtime.Types.Utils.Record<string, any>> {
    returns: TypeMap<this['params']['extArgs'], GlobalOmitOptions>;
}
export type TypeMap<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
        omit: GlobalOmitOptions;
    };
    meta: {
        modelProps: "providerConfig" | "providerConnection" | "deliveryLog" | "messageMapping" | "analyticsOutbox";
        txIsolationLevel: TransactionIsolationLevel;
    };
    model: {
        ProviderConfig: {
            payload: Prisma.$ProviderConfigPayload<ExtArgs>;
            fields: Prisma.ProviderConfigFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.ProviderConfigFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.ProviderConfigFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>;
                };
                findFirst: {
                    args: Prisma.ProviderConfigFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.ProviderConfigFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>;
                };
                findMany: {
                    args: Prisma.ProviderConfigFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>[];
                };
                create: {
                    args: Prisma.ProviderConfigCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>;
                };
                createMany: {
                    args: Prisma.ProviderConfigCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.ProviderConfigCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>[];
                };
                delete: {
                    args: Prisma.ProviderConfigDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>;
                };
                update: {
                    args: Prisma.ProviderConfigUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>;
                };
                deleteMany: {
                    args: Prisma.ProviderConfigDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.ProviderConfigUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.ProviderConfigUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>[];
                };
                upsert: {
                    args: Prisma.ProviderConfigUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConfigPayload>;
                };
                aggregate: {
                    args: Prisma.ProviderConfigAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateProviderConfig>;
                };
                groupBy: {
                    args: Prisma.ProviderConfigGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.ProviderConfigGroupByOutputType>[];
                };
                count: {
                    args: Prisma.ProviderConfigCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.ProviderConfigCountAggregateOutputType> | number;
                };
            };
        };
        ProviderConnection: {
            payload: Prisma.$ProviderConnectionPayload<ExtArgs>;
            fields: Prisma.ProviderConnectionFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.ProviderConnectionFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.ProviderConnectionFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>;
                };
                findFirst: {
                    args: Prisma.ProviderConnectionFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.ProviderConnectionFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>;
                };
                findMany: {
                    args: Prisma.ProviderConnectionFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>[];
                };
                create: {
                    args: Prisma.ProviderConnectionCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>;
                };
                createMany: {
                    args: Prisma.ProviderConnectionCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.ProviderConnectionCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>[];
                };
                delete: {
                    args: Prisma.ProviderConnectionDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>;
                };
                update: {
                    args: Prisma.ProviderConnectionUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>;
                };
                deleteMany: {
                    args: Prisma.ProviderConnectionDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.ProviderConnectionUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.ProviderConnectionUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>[];
                };
                upsert: {
                    args: Prisma.ProviderConnectionUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$ProviderConnectionPayload>;
                };
                aggregate: {
                    args: Prisma.ProviderConnectionAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateProviderConnection>;
                };
                groupBy: {
                    args: Prisma.ProviderConnectionGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.ProviderConnectionGroupByOutputType>[];
                };
                count: {
                    args: Prisma.ProviderConnectionCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.ProviderConnectionCountAggregateOutputType> | number;
                };
            };
        };
        DeliveryLog: {
            payload: Prisma.$DeliveryLogPayload<ExtArgs>;
            fields: Prisma.DeliveryLogFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.DeliveryLogFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.DeliveryLogFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>;
                };
                findFirst: {
                    args: Prisma.DeliveryLogFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.DeliveryLogFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>;
                };
                findMany: {
                    args: Prisma.DeliveryLogFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>[];
                };
                create: {
                    args: Prisma.DeliveryLogCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>;
                };
                createMany: {
                    args: Prisma.DeliveryLogCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.DeliveryLogCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>[];
                };
                delete: {
                    args: Prisma.DeliveryLogDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>;
                };
                update: {
                    args: Prisma.DeliveryLogUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>;
                };
                deleteMany: {
                    args: Prisma.DeliveryLogDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.DeliveryLogUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.DeliveryLogUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>[];
                };
                upsert: {
                    args: Prisma.DeliveryLogUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$DeliveryLogPayload>;
                };
                aggregate: {
                    args: Prisma.DeliveryLogAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateDeliveryLog>;
                };
                groupBy: {
                    args: Prisma.DeliveryLogGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DeliveryLogGroupByOutputType>[];
                };
                count: {
                    args: Prisma.DeliveryLogCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.DeliveryLogCountAggregateOutputType> | number;
                };
            };
        };
        MessageMapping: {
            payload: Prisma.$MessageMappingPayload<ExtArgs>;
            fields: Prisma.MessageMappingFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.MessageMappingFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.MessageMappingFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>;
                };
                findFirst: {
                    args: Prisma.MessageMappingFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.MessageMappingFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>;
                };
                findMany: {
                    args: Prisma.MessageMappingFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>[];
                };
                create: {
                    args: Prisma.MessageMappingCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>;
                };
                createMany: {
                    args: Prisma.MessageMappingCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.MessageMappingCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>[];
                };
                delete: {
                    args: Prisma.MessageMappingDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>;
                };
                update: {
                    args: Prisma.MessageMappingUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>;
                };
                deleteMany: {
                    args: Prisma.MessageMappingDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.MessageMappingUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.MessageMappingUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>[];
                };
                upsert: {
                    args: Prisma.MessageMappingUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MessageMappingPayload>;
                };
                aggregate: {
                    args: Prisma.MessageMappingAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateMessageMapping>;
                };
                groupBy: {
                    args: Prisma.MessageMappingGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.MessageMappingGroupByOutputType>[];
                };
                count: {
                    args: Prisma.MessageMappingCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.MessageMappingCountAggregateOutputType> | number;
                };
            };
        };
        AnalyticsOutbox: {
            payload: Prisma.$AnalyticsOutboxPayload<ExtArgs>;
            fields: Prisma.AnalyticsOutboxFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.AnalyticsOutboxFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.AnalyticsOutboxFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>;
                };
                findFirst: {
                    args: Prisma.AnalyticsOutboxFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.AnalyticsOutboxFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>;
                };
                findMany: {
                    args: Prisma.AnalyticsOutboxFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>[];
                };
                create: {
                    args: Prisma.AnalyticsOutboxCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>;
                };
                createMany: {
                    args: Prisma.AnalyticsOutboxCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.AnalyticsOutboxCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>[];
                };
                delete: {
                    args: Prisma.AnalyticsOutboxDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>;
                };
                update: {
                    args: Prisma.AnalyticsOutboxUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>;
                };
                deleteMany: {
                    args: Prisma.AnalyticsOutboxDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.AnalyticsOutboxUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.AnalyticsOutboxUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>[];
                };
                upsert: {
                    args: Prisma.AnalyticsOutboxUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$AnalyticsOutboxPayload>;
                };
                aggregate: {
                    args: Prisma.AnalyticsOutboxAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateAnalyticsOutbox>;
                };
                groupBy: {
                    args: Prisma.AnalyticsOutboxGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AnalyticsOutboxGroupByOutputType>[];
                };
                count: {
                    args: Prisma.AnalyticsOutboxCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AnalyticsOutboxCountAggregateOutputType> | number;
                };
            };
        };
    };
} & {
    other: {
        payload: any;
        operations: {
            $executeRaw: {
                args: [query: TemplateStringsArray | Sql, ...values: any[]];
                result: any;
            };
            $executeRawUnsafe: {
                args: [query: string, ...values: any[]];
                result: any;
            };
            $queryRaw: {
                args: [query: TemplateStringsArray | Sql, ...values: any[]];
                result: any;
            };
            $queryRawUnsafe: {
                args: [query: string, ...values: any[]];
                result: any;
            };
        };
    };
};
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
    readonly DbNull: runtime.DbNullClass;
    readonly JsonNull: runtime.JsonNullClass;
};
export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput];
export declare const JsonNullValueInput: {
    readonly JsonNull: runtime.JsonNullClass;
};
export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput];
export declare const QueryMode: {
    readonly default: "default";
    readonly insensitive: "insensitive";
};
export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];
export declare const JsonNullValueFilter: {
    readonly DbNull: runtime.DbNullClass;
    readonly JsonNull: runtime.JsonNullClass;
    readonly AnyNull: runtime.AnyNullClass;
};
export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter];
export declare const NullsOrder: {
    readonly first: "first";
    readonly last: "last";
};
export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder];
export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>;
export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>;
export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>;
export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>;
export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>;
export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>;
export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>;
export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>;
export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>;
export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>;
export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>;
export type BatchPayload = {
    count: number;
};
export declare const defineExtension: runtime.Types.Extensions.ExtendsHook<"define", TypeMapCb, runtime.Types.Extensions.DefaultArgs>;
export type DefaultPrismaClient = PrismaClient;
export type ErrorFormat = 'pretty' | 'colorless' | 'minimal';
export interface PrismaClientBaseOptions {
    errorFormat?: ErrorFormat;
    log?: (LogLevel | LogDefinition)[];
    transactionOptions?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: TransactionIsolationLevel;
    };
    omit?: GlobalOmitConfig;
    comments?: runtime.SqlCommenterPlugin[];
    queryPlanCacheMaxSize?: number;
}
export interface PrismaClientOptionsWithAccelerateUrl extends PrismaClientBaseOptions {
    accelerateUrl: string;
    adapter?: never;
}
export interface PrismaClientOptionsWithAdapter extends PrismaClientBaseOptions {
    adapter: runtime.SqlDriverAdapterFactory;
    accelerateUrl?: never;
}
export type PrismaClientOptions = PrismaClientOptionsWithAccelerateUrl | PrismaClientOptionsWithAdapter;
export type GlobalOmitConfig = {
    providerConfig?: Prisma.ProviderConfigOmit;
    providerConnection?: Prisma.ProviderConnectionOmit;
    deliveryLog?: Prisma.DeliveryLogOmit;
    messageMapping?: Prisma.MessageMappingOmit;
    analyticsOutbox?: Prisma.AnalyticsOutboxOmit;
};
export type LogLevel = 'info' | 'query' | 'warn' | 'error';
export type LogDefinition = {
    level: LogLevel;
    emit: 'stdout' | 'event';
};
export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;
export type GetLogType<T> = CheckIsLogLevel<T extends LogDefinition ? T['level'] : T>;
export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition> ? GetLogType<T[number]> : never;
export type QueryEvent = {
    timestamp: Date;
    query: string;
    params: string;
    duration: number;
    target: string;
};
export type LogEvent = {
    timestamp: Date;
    message: string;
    target: string;
};
export type PrismaAction = 'findUnique' | 'findUniqueOrThrow' | 'findMany' | 'findFirst' | 'findFirstOrThrow' | 'create' | 'createMany' | 'createManyAndReturn' | 'update' | 'updateMany' | 'updateManyAndReturn' | 'upsert' | 'delete' | 'deleteMany' | 'executeRaw' | 'queryRaw' | 'aggregate' | 'count' | 'runCommandRaw' | 'findRaw' | 'groupBy';
export type TransactionClient = Omit<DefaultPrismaClient, runtime.ITXClientDenyList>;

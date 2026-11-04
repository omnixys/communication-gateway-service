export interface JsonRequestOptions {
    readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    readonly url: string;
    readonly timeoutMs: number;
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: unknown;
}
export interface JsonResponse {
    readonly ok: boolean;
    readonly status: number;
    readonly data: Record<string, unknown> | null;
    readonly text: string;
}
export declare class HttpTransportError extends Error {
    readonly kind: 'timeout' | 'network';
    constructor(message: string, kind: 'timeout' | 'network');
}
export declare function requestJson(options: JsonRequestOptions): Promise<JsonResponse>;
export declare function probeHttp(name: string, url: string, timeoutMs: number, headers?: Readonly<Record<string, string>>): Promise<{
    up: boolean;
    message: string;
}>;

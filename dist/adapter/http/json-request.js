import { getLogger } from '@omnixys/logger-ts';
const logger = getLogger('HttpClient', 'util');
export class HttpTransportError extends Error {
    kind;
    constructor(message, kind) {
        super(message);
        this.kind = kind;
        this.name = 'HttpTransportError';
    }
}
export async function requestJson(options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, options.timeoutMs);
    try {
        const response = await fetch(options.url, {
            method: options.method,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers ?? {}),
            },
            ...(options.body === undefined
                ? {}
                : { body: JSON.stringify(options.body) }),
            signal: controller.signal,
        });
        const text = await response.text();
        return {
            ok: response.ok,
            status: response.status,
            data: parseJsonObject(text),
            text,
        };
    }
    catch (error) {
        if (error instanceof HttpTransportError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        const aborted = error instanceof Error &&
            (error.name === 'AbortError' || error.name === 'TimeoutError');
        if (aborted) {
            throw new HttpTransportError(`Request to ${options.url} timed out after ${String(options.timeoutMs)}ms`, 'timeout');
        }
        throw new HttpTransportError(`Request to ${options.url} failed: ${message}`, 'network');
    }
    finally {
        clearTimeout(timeout);
    }
}
export async function probeHttp(name, url, timeoutMs, headers = {}) {
    try {
        const response = await requestJson({
            method: 'GET',
            url,
            timeoutMs,
            headers,
        });
        return response.ok
            ? { up: true, message: 'ok' }
            : { up: false, message: `HTTP ${String(response.status)}` };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn({ check: name, url, error: message }, 'health check failed');
        return { up: false, message };
    }
}
function parseJsonObject(text) {
    if (text.length === 0) {
        return null;
    }
    try {
        const parsed = JSON.parse(text);
        return typeof parsed === 'object' &&
            parsed !== null &&
            !Array.isArray(parsed)
            ? parsed
            : null;
    }
    catch {
        return null;
    }
}

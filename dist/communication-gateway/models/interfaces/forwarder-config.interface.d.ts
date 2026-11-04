export interface ForwarderConfig {
    readonly maxAttempts: number;
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
    readonly timeoutMs: number;
}

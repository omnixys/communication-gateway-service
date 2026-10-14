export interface ForwarderConfig {
  /** Total attempts per forwarded event, including the first one. */
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly timeoutMs: number;
}

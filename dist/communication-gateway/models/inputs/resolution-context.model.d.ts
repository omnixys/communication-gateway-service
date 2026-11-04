export interface ResolutionContext {
    readonly tenantId: string | null;
    readonly deploymentId: string | null;
    readonly metadata: Readonly<Record<string, unknown>>;
}

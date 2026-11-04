import type { StalwartAuthMode } from '../../../communication-gateway/models/enums/provider-config.enum.js';
export interface SmtpCredentials {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: string;
    readonly authMode: StalwartAuthMode;
}
export interface SmtpSecurity {
    readonly tlsEnabled: boolean;
    readonly tlsVerify: boolean;
    readonly timeoutMs: number;
}
export interface SmtpEnvelope {
    readonly from: string;
    readonly to: string;
    readonly raw: string;
}
export declare class SmtpError extends Error {
    readonly command: string;
    constructor(message: string, command: string);
}
export interface SmtpReply {
    readonly code: number;
    readonly text: string;
    readonly isFailure: boolean;
}
export declare class SmtpClient {
    private readonly credentials;
    private readonly security;
    private readonly tokenProvider;
    constructor(credentials: SmtpCredentials, security: SmtpSecurity, tokenProvider?: (() => Promise<string>) | null);
    probe(): Promise<boolean>;
    send(envelope: SmtpEnvelope): Promise<void>;
    private maybeUpgrade;
    private authenticate;
    private authenticateLogin;
    private authenticateOauthBearer;
    private oauthToken;
}
export declare function dotStuff(raw: string): string;

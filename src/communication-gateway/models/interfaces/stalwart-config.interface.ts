import type { StalwartAuthMode } from '../enums/provider-config.enum.js';

export interface StalwartConfig {
  readonly enabled: boolean;
  readonly priority: number;
  readonly timeout: number;
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly authMode: StalwartAuthMode;
  readonly oauthTokenUrl: string;
  readonly oauthClientId: string;
  readonly oauthClientSecret: string;
  readonly fromAddress: string;
  readonly tlsEnabled: boolean;
  readonly tlsVerify: boolean;
}

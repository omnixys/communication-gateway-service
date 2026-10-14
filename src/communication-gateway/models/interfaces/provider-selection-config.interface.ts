import type { EmailProviderName } from '../enums/provider-config.enum.js';
import type { EvolutionConfig } from './evolution-config.interface.js';
import type { ResendConfig } from './resend-config.interface.js';
import type { StalwartConfig } from './stalwart-config.interface.js';

export interface ProviderSelectionConfig {
  readonly evolution: EvolutionConfig;
  readonly resend: ResendConfig;
  readonly stalwart: StalwartConfig;
  readonly emailPrimary: EmailProviderName;
  readonly emailFallback: EmailProviderName;
}

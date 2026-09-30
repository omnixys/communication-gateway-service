/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2026 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import { Global, Module } from '@nestjs/common';

import { loadConfig } from './configuration';
import type { AppConfig } from './config.types';

/** Injection token for the validated runtime configuration. */
export const APP_CONFIG = Symbol('APP_CONFIG');

/**
 * Provides the single, validated {@link AppConfig} instance to the whole
 * application. Parsing happens once during bootstrap so a misconfigured
 * deployment fails before the HTTP port is opened.
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => loadConfig(process.env),
    },
  ],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}

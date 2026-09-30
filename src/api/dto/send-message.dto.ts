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

import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/** Channels that can be addressed through the public send endpoint. */
export const SENDABLE_CHANNELS = ['EMAIL', 'WHATSAPP'] as const;

/** Body of `POST /api/v1/messages/send`. */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  id!: string;

  @IsIn(SENDABLE_CHANNELS)
  channel!: (typeof SENDABLE_CHANNELS)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  recipientAddress?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  recipientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  senderAddress?: string;

  @IsOptional()
  @IsUUID('7')
  senderId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  body!: string;

  @IsOptional()
  @IsIn(['TEXT', 'HTML'])
  contentType?: 'TEXT' | 'HTML';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(998)
  subject?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/** Path parameter of the provider health endpoint. */
export class ProviderParamDto {
  @IsString()
  @Matches(/^[A-Za-z_]+$/u, { message: 'providerType must be an identifier' })
  providerType!: string;
}

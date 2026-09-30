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

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { SendMessageDto } from '../models/dto/send-message.dto.js';
import type { SendMessageResult } from '../models/payloads/send-message.payload.js';
import { MessagesService } from '../services/messages.service.js';

@Controller('api/v1/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /**
   * Delivers a message through the provider that the resolver picks for the
   * channel. The providers used here are synchronous, so the response already
   * carries the provider message id instead of a pending job handle.
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() body: SendMessageDto): Promise<SendMessageResult> {
    return this.messages.send(body);
  }
}

import { SendMessageDto } from '../models/dto/send-message.dto.js';
import type { SendMessageResult } from '../models/payloads/send-message.payload.js';
import { MessagesService } from '../services/messages.service.js';
export declare class MessagesController {
    private readonly messages;
    constructor(messages: MessagesService);
    send(body: SendMessageDto, tenantId?: string): Promise<SendMessageResult>;
}

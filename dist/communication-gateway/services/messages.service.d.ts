import type { SendMessageDto } from '../models/dto/send-message.dto.js';
import type { AddressResolver } from '../models/interfaces/address-resolver.port.js';
import type { MessageMappingStore } from '../models/interfaces/message-mapping-store.port.js';
import type { SendMessageResult } from '../models/payloads/send-message.payload.js';
import { GatewayDispatcher } from './gateway-dispatcher.service.js';
export declare class MessagesService {
    private readonly dispatcher;
    private readonly mappingStore;
    private readonly addressResolver;
    constructor(dispatcher: GatewayDispatcher, mappingStore: MessageMappingStore, addressResolver: AddressResolver);
    send(dto: SendMessageDto): Promise<SendMessageResult>;
    private resolveAddress;
    private recordFailure;
    private saveMapping;
}

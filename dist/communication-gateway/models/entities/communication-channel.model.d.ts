import type { CommunicationChannelType } from '../enums/gateway.enums.js';
export interface CommunicationChannel {
    readonly type: CommunicationChannelType;
}

import type { CommunicationChannelType } from '../enums/gateway.enums.js';
export interface AddressResolver {
    resolve(userId: string, channel: CommunicationChannelType): Promise<string>;
    reverseLookup(address: string): Promise<string | null>;
}

import type { CommunicationChannelType } from '../../communication-gateway/models/enums/gateway.enums.js';
import type { AddressMapping } from '../../communication-gateway/models/interfaces/address-mapping.interface.js';
import type { AddressResolver } from '../../communication-gateway/models/interfaces/address-resolver.port.js';
export declare class DictAddressResolver implements AddressResolver {
    private readonly forward;
    private readonly reverse;
    constructor(mapping?: AddressMapping);
    resolve(userId: string, channel: CommunicationChannelType): Promise<string>;
    reverseLookup(address: string): Promise<string | null>;
}

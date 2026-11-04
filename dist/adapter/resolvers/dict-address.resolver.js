import { getLogger } from '@omnixys/logger-ts';
import { AddressResolutionError } from '../../communication-gateway/errors/gateway.errors.js';
const logger = getLogger('DictAddressResolver', 'class');
export class DictAddressResolver {
    forward = new Map();
    reverse = new Map();
    constructor(mapping = {}) {
        for (const [userId, channels] of Object.entries(mapping)) {
            const perChannel = new Map();
            for (const [channel, address] of Object.entries(channels)) {
                perChannel.set(channel.toUpperCase(), address);
                this.reverse.set(address, userId);
            }
            this.forward.set(userId, perChannel);
        }
    }
    async resolve(userId, channel) {
        const perChannel = this.forward.get(userId);
        if (perChannel === undefined) {
            logger.warn({ userId, channel }, 'address resolution failed: no user mapping');
            throw new AddressResolutionError(userId, channel, `No address mapping for user '${userId}'`);
        }
        const address = perChannel.get(channel);
        if (address === undefined) {
            logger.warn({ userId, channel }, 'address resolution failed: no channel address');
            throw new AddressResolutionError(userId, channel, `No ${channel} address for user '${userId}'`);
        }
        return address;
    }
    async reverseLookup(address) {
        return this.reverse.get(address) ?? null;
    }
}

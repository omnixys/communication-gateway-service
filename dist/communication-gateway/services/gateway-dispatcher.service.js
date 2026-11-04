import { getLogger } from '@omnixys/logger-ts';
const logger = getLogger('GatewayDispatcher', 'class');
export class GatewayDispatcher {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    async dispatch(message, context) {
        logger.info({
            messageId: message.id,
            channel: message.channel.type,
            to: message.to,
        }, 'dispatch started');
        try {
            const entry = this.registry.getByChannel(message.channel);
            const provider = await entry.resolver.resolve(message, context);
            const result = await provider.send(message);
            logger.info({
                messageId: message.id,
                provider: provider.providerType,
                providerMessageId: result.providerMessageId,
                success: result.success,
            }, 'dispatch completed');
            return result;
        }
        catch (error) {
            logger.error({
                messageId: message.id,
                channel: message.channel.type,
                error: error instanceof Error ? error.message : String(error),
            }, 'dispatch failed');
            throw error;
        }
    }
}

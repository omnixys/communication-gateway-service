var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Catch, HttpException, HttpStatus, } from '@nestjs/common';
const SERVER_ERROR = 500;
import { getLogger } from '@omnixys/logger-ts';
import { AddressResolutionError, ChannelNotFoundError, DeliveryFailedError, InvalidStatusTransitionError, NoProviderAvailableError, ProviderNotAvailableError, ProviderNotFoundError, WebhookVerificationError, } from '../errors/gateway.errors.js';
import { ContextAccessor } from '@omnixys/context-ts';
const logger = getLogger('GatewayExceptionFilter', 'class');
let GatewayExceptionFilter = class GatewayExceptionFilter {
    catch(exception, host) {
        if (host.getType() === 'graphql') {
            return exception;
        }
        const http = host.switchToHttp();
        const reply = http.getResponse();
        const request = http.getRequest();
        const correlationId = ContextAccessor.current()?.correlationId ?? 'unknown';
        const { status, message, error } = describe(exception);
        const body = {
            statusCode: status,
            message,
            error,
            correlationId,
        };
        if (status >= SERVER_ERROR) {
            logger.error({
                correlationId,
                method: request?.method,
                url: request?.url,
                error: message,
                stack: exception instanceof Error ? exception.stack : undefined,
            }, 'request_failed');
        }
        else {
            logger.warn({
                correlationId,
                method: request?.method,
                url: request?.url,
                status,
                error: message,
            }, 'request_rejected');
        }
        if (typeof reply.status === 'function') {
            reply.status(status).send(body);
        }
        else {
            const raw = reply;
            raw.statusCode = status;
            raw.end(JSON.stringify(body));
        }
        return undefined;
    }
};
GatewayExceptionFilter = __decorate([
    Catch()
], GatewayExceptionFilter);
export { GatewayExceptionFilter };
function describe(exception) {
    if (exception instanceof HttpException) {
        const status = exception.getStatus();
        const payload = exception.getResponse();
        if (typeof payload === 'string') {
            return { status, message: payload, error: reason(status) };
        }
        const record = payload;
        const message = Array.isArray(record.message)
            ? record.message.join('; ')
            : typeof record.message === 'string'
                ? record.message
                : exception.message;
        return {
            status,
            message,
            error: typeof record.error === 'string' ? record.error : reason(status),
        };
    }
    const domain = describeDomainError(exception);
    if (domain !== null) {
        return domain;
    }
    return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'InternalServerError',
    };
}
function describeDomainError(exception) {
    if (exception instanceof NoProviderAvailableError) {
        return {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'NO_PROVIDER_AVAILABLE',
            error: reason(HttpStatus.SERVICE_UNAVAILABLE),
        };
    }
    if (exception instanceof ProviderNotAvailableError) {
        return {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'PROVIDER_NOT_AVAILABLE',
            error: reason(HttpStatus.SERVICE_UNAVAILABLE),
        };
    }
    if (exception instanceof ProviderNotFoundError) {
        return {
            status: HttpStatus.NOT_FOUND,
            message: 'PROVIDER_NOT_FOUND',
            error: reason(HttpStatus.NOT_FOUND),
        };
    }
    if (exception instanceof ChannelNotFoundError) {
        return {
            status: HttpStatus.NOT_FOUND,
            message: 'CHANNEL_NOT_FOUND',
            error: reason(HttpStatus.NOT_FOUND),
        };
    }
    if (exception instanceof AddressResolutionError) {
        return {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            message: 'ADDRESS_RESOLUTION_FAILED',
            error: reason(HttpStatus.UNPROCESSABLE_ENTITY),
        };
    }
    if (exception instanceof WebhookVerificationError) {
        return {
            status: HttpStatus.UNAUTHORIZED,
            message: 'WEBHOOK_VERIFICATION_FAILED',
            error: reason(HttpStatus.UNAUTHORIZED),
        };
    }
    if (exception instanceof DeliveryFailedError) {
        return {
            status: HttpStatus.BAD_GATEWAY,
            message: 'DELIVERY_FAILED',
            error: reason(HttpStatus.BAD_GATEWAY),
        };
    }
    if (exception instanceof InvalidStatusTransitionError) {
        return {
            status: HttpStatus.CONFLICT,
            message: 'INVALID_STATUS_TRANSITION',
            error: reason(HttpStatus.CONFLICT),
        };
    }
    return null;
}
function reason(status) {
    const text = HttpStatus[status];
    return text === undefined
        ? 'Error'
        : text.replace(/([a-z])([A-Z])/gu, '$1 $2');
}

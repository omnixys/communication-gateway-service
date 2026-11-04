import { type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
export interface ErrorBody {
    readonly statusCode: number;
    readonly message: string;
    readonly error: string;
    readonly correlationId: string;
}
export declare class GatewayExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): unknown;
}

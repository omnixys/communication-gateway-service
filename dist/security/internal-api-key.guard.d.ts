import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare const INTERNAL_API_KEY_HEADER = "x-internal-api-key";
export declare class InternalApiKeyGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}

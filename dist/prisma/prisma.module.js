var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MessageMappingRepository } from './message-mapping.repository.js';
import { PrismaService } from './prisma.service.js';
import { MESSAGE_MAPPING_STORE } from './tokens.js';
import { Global, Module } from '@nestjs/common';
let PrismaModule = class PrismaModule {
};
PrismaModule = __decorate([
    Global(),
    Module({
        providers: [
            PrismaService,
            MessageMappingRepository,
            { provide: MESSAGE_MAPPING_STORE, useExisting: MessageMappingRepository },
        ],
        exports: [PrismaService, MESSAGE_MAPPING_STORE],
    })
], PrismaModule);
export { PrismaModule };

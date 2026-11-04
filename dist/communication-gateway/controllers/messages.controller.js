var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post, } from '@nestjs/common';
import { SendMessageDto } from '../models/dto/send-message.dto.js';
import { MessagesService } from '../services/messages.service.js';
let MessagesController = class MessagesController {
    messages;
    constructor(messages) {
        this.messages = messages;
    }
    async send(body, tenantId) {
        if (tenantId &&
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(tenantId)) {
            throw new BadRequestException('x-tenant-id must be a valid UUID');
        }
        return this.messages.send(body);
    }
};
__decorate([
    Post('send'),
    HttpCode(HttpStatus.OK),
    __param(0, Body()),
    __param(1, Headers('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendMessageDto, String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "send", null);
MessagesController = __decorate([
    Controller('api/v1/messages'),
    __metadata("design:paramtypes", [MessagesService])
], MessagesController);
export { MessagesController };

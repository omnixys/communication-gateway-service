var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, } from 'class-validator';
export const SENDABLE_CHANNELS = ['EMAIL', 'WHATSAPP'];
export class SendMessageDto {
    id;
    channel;
    recipientAddress;
    recipientId;
    senderAddress;
    senderId;
    body;
    contentType;
    subject;
    metadata;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(255),
    __metadata("design:type", String)
], SendMessageDto.prototype, "id", void 0);
__decorate([
    IsIn(SENDABLE_CHANNELS),
    __metadata("design:type", Object)
], SendMessageDto.prototype, "channel", void 0);
__decorate([
    IsOptional(),
    IsString(),
    IsNotEmpty(),
    MaxLength(500),
    __metadata("design:type", String)
], SendMessageDto.prototype, "recipientAddress", void 0);
__decorate([
    IsOptional(),
    IsString(),
    IsNotEmpty(),
    MaxLength(255),
    __metadata("design:type", String)
], SendMessageDto.prototype, "recipientId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(500),
    __metadata("design:type", String)
], SendMessageDto.prototype, "senderAddress", void 0);
__decorate([
    IsOptional(),
    IsUUID('7'),
    __metadata("design:type", String)
], SendMessageDto.prototype, "senderId", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(100_000),
    __metadata("design:type", String)
], SendMessageDto.prototype, "body", void 0);
__decorate([
    IsOptional(),
    IsIn(['TEXT', 'HTML']),
    __metadata("design:type", String)
], SendMessageDto.prototype, "contentType", void 0);
__decorate([
    IsOptional(),
    IsString(),
    IsNotEmpty(),
    MaxLength(998),
    __metadata("design:type", String)
], SendMessageDto.prototype, "subject", void 0);
__decorate([
    IsOptional(),
    IsObject(),
    __metadata("design:type", Object)
], SendMessageDto.prototype, "metadata", void 0);
export class ProviderParamDto {
    providerType;
}
__decorate([
    IsString(),
    Matches(/^[A-Za-z_]+$/u, { message: 'providerType must be an identifier' }),
    __metadata("design:type", String)
], ProviderParamDto.prototype, "providerType", void 0);

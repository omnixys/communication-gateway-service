import type { AttachmentType } from '../enums/gateway.enums.js';
export interface AttachmentReference {
    readonly attachmentId: string;
    readonly type: AttachmentType;
    readonly url: string;
    readonly filename: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
}

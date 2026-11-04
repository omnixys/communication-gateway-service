import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifyEvolutionSignature(body, secret, signature) {
    if (signature === null || signature.length === 0 || secret.length === 0) {
        return false;
    }
    const expected = createHmac('sha256', secret).update(body).digest();
    let provided;
    try {
        provided = Buffer.from(signature.startsWith('sha256=') ? signature.slice(7) : signature, 'hex');
    }
    catch {
        return false;
    }
    if (provided.length !== expected.length) {
        return false;
    }
    return timingSafeEqual(provided, expected);
}
export function verifyApiKey(candidate, expected) {
    if (candidate === null || candidate.length === 0) {
        return false;
    }
    return constantTimeEquals(candidate, expected);
}
function constantTimeEquals(candidate, expected) {
    if (expected.length === 0) {
        return false;
    }
    const provided = Buffer.from(candidate, 'utf8');
    const configured = Buffer.from(expected, 'utf8');
    if (provided.length !== configured.length) {
        return false;
    }
    return timingSafeEqual(provided, configured);
}
export function verifyBearerSecret(headers, secret) {
    if (secret.length === 0) {
        return false;
    }
    const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === 'authorization');
    const value = entry?.[1];
    if (!value?.startsWith('Bearer ')) {
        return false;
    }
    return constantTimeEquals(value.slice(7), secret);
}

export declare function verifyEvolutionSignature(body: Buffer, secret: string, signature: string | null): boolean;
export declare function verifyApiKey(candidate: string | null, expected: string): boolean;
export declare function verifyBearerSecret(headers: Readonly<Record<string, string>>, secret: string): boolean;

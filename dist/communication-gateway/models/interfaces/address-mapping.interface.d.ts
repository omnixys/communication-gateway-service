export interface AddressMapping {
    readonly [userId: string]: Readonly<Record<string, string>>;
}

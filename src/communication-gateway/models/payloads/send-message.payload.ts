/** Serialized provider identity returned by the REST API. */
export interface ProviderIdentityResponse {
  readonly name: string;
  readonly providerType: string;
  readonly version: string;
  readonly instance: string | null;
  readonly apiVersion: string | null;
}

/** Response body of `POST /api/v1/messages/send`. */
export interface SendMessageResult {
  readonly success: boolean;
  readonly providerMessageId: string | null;
  readonly status: string | null;
  readonly error: string | null;
  readonly providerIdentity: ProviderIdentityResponse | null;
}

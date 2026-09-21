export const ACCESS_TOKEN_SIGNER = Symbol('ACCESS_TOKEN_SIGNER');

export type AccessTokenClaims = { sub: string };

export interface AccessTokenSignerPort {
  sign(claims: AccessTokenClaims): Promise<string>;
  verify(token: string): Promise<AccessTokenClaims | null>;
}

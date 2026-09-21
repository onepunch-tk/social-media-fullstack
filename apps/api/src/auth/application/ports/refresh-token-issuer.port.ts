export const REFRESH_TOKEN_ISSUER = Symbol('REFRESH_TOKEN_ISSUER');

export type IssuedRefreshToken = { raw: string; hash: string; expiresAt: Date };

export interface RefreshTokenIssuerPort {
  generate(): IssuedRefreshToken;
  hash(raw: string): string;
}

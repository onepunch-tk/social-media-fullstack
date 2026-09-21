import type { RefreshToken } from '#auth/domain/entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export class RefreshTokenAlreadyRotatedError extends Error {
  constructor(readonly field: 'refreshToken') {
    super('로그인이 만료되었습니다. 다시 로그인해주세요.');
    this.name = 'RefreshTokenAlreadyRotatedError';
  }
}

export interface RefreshTokenRepositoryPort {
  save(token: RefreshToken): Promise<void>;
  findByHash(hash: string): Promise<RefreshToken | null>;
  replace(current: RefreshToken, next: RefreshToken): Promise<void>; // rotation
}

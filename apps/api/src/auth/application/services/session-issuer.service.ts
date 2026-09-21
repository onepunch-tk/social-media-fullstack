import { Inject, Injectable } from '@nestjs/common';
import { RefreshToken } from '#auth/domain/entities/refresh-token.entity';
import type { AccountId } from '#auth/domain/value-objects/account-id.vo';
import { ACCESS_TOKEN_SIGNER, type AccessTokenSignerPort } from '../ports/access-token-signer.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepositoryPort,
} from '../ports/refresh-token.repository.port';
import {
  REFRESH_TOKEN_ISSUER,
  type RefreshTokenIssuerPort,
} from '../ports/refresh-token-issuer.port';

export interface AuthSession {
  accountId: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(REFRESH_TOKEN_ISSUER) private readonly issuer: RefreshTokenIssuerPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    @Inject(ACCESS_TOKEN_SIGNER) private readonly signer: AccessTokenSignerPort,
  ) {}

  async issue(accountId: AccountId): Promise<AuthSession> {
    const issued = this.issuer.generate();
    await this.refreshTokenRepository.save(
      RefreshToken.issue(accountId, issued.hash, issued.expiresAt),
    );
    const accessToken = await this.signer.sign({ sub: accountId.value });

    return {
      accountId: accountId.value,
      accessToken,
      refreshToken: issued.raw,
    };
  }

  async rotate(current: RefreshToken): Promise<AuthSession> {
    const issued = this.issuer.generate();
    await this.refreshTokenRepository.replace(current, current.rotate(issued.hash)); // AlreadyRotated는 전파
    return this.toSession(current.accountId, issued.raw);
  }

  private async toSession(accountId: AccountId, refreshToken: string): Promise<AuthSession> {
    const accessToken = await this.signer.sign({ sub: accountId.value });
    return { accountId: accountId.value, accessToken, refreshToken };
  }
}

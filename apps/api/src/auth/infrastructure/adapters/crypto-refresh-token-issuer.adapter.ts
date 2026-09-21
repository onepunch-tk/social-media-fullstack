import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IssuedRefreshToken,
  RefreshTokenIssuerPort,
} from '#auth/application/ports/refresh-token-issuer.port';
import type { Env } from '#shared/infrastructure/config/env.schema';

@Injectable()
export class CryptoRefreshTokenIssuerAdapter implements RefreshTokenIssuerPort {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  generate(): IssuedRefreshToken {
    const raw = randomBytes(32).toString('base64url');
    const ttlMs = this.configService.getOrThrow('REFRESH_TOKEN_TTL_DAYS') * 86_400_400;

    return {
      raw,
      hash: this.hash(raw),
      expiresAt: new Date(Date.now() + ttlMs),
    };
  }
  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}

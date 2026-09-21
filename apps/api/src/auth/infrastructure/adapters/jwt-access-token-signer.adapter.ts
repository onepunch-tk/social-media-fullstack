import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  AccessTokenClaims,
  AccessTokenSignerPort,
} from '#auth/application/ports/access-token-signer.port';
import type { Env } from '#shared/infrastructure/config/env.schema';

@Injectable()
export class JwtAccessTokenSignerAdapter implements AccessTokenSignerPort {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async sign(claims: AccessTokenClaims): Promise<string> {
    return this.jwtService.signAsync(claims, {
      secret: this.configService.getOrThrow('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.getOrThrow('JWT_ACCESS_TTL_SECONDS', { infer: true }),
    });
  }
  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      return await this.jwtService.verifyAsync<AccessTokenClaims>(token, {
        secret: this.configService.getOrThrow('JWT_ACCESS_SECRET', { infer: true }),
      });
    } catch {
      return null;
    }
  }
}

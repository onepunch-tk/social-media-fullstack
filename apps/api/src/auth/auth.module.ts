import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ACCESS_TOKEN_SIGNER } from './application/ports/access-token-signer.port';
import { ACCOUNT_REPOSITORY } from './application/ports/account.repository.port';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { REFRESH_TOKEN_REPOSITORY } from './application/ports/refresh-token.repository.port';
import { REFRESH_TOKEN_ISSUER } from './application/ports/refresh-token-issuer.port';
import { QueryHandlers } from './application/queries';
import { SessionIssuer } from './application/services/session-issuer.service';
import { CommandHandlers } from './application/use-cases/index';
import { BcryptPasswordHasherAdapter } from './infrastructure/adapters/bcrypt-password-hasher.adapter';
import { CryptoRefreshTokenIssuerAdapter } from './infrastructure/adapters/crypto-refresh-token-issuer.adapter';
import { DrizzleAccountRepositoryAdapter } from './infrastructure/adapters/drizzle-account.repository.adapter';
import { DrizzleRefreshTokenRepositoryAdapter } from './infrastructure/adapters/drizzle-refresh-token.repository.adapter';
import { JwtAccessTokenSignerAdapter } from './infrastructure/adapters/jwt-access-token-signer.adapter';
import { AuthController } from './presentation/auth.controller';
import { AccessTokenGuard } from './presentation/guards/access-token.guard';
import { RefreshTokenCleanupScheduler } from './presentation/schedulers/refresh-token-cleanup.scheduler';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    SessionIssuer,
    RefreshTokenCleanupScheduler,
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasherAdapter,
    },
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: DrizzleAccountRepositoryAdapter,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: DrizzleRefreshTokenRepositoryAdapter,
    },
    {
      provide: REFRESH_TOKEN_ISSUER,
      useClass: CryptoRefreshTokenIssuerAdapter,
    },
    {
      provide: ACCESS_TOKEN_SIGNER,
      useClass: JwtAccessTokenSignerAdapter,
    },
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { ACCOUNT_REPOSITORY } from './application/ports/account.repository.port.js';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port.js';
import { CommandHandlers } from './application/use-cases/index.js';
import { BcryptPasswordHasherAdapter } from './infrastructure/adapters/bcrypt-password-hasher.adapter.js';
import { DrizzleAccountRepositoryAdapter } from './infrastructure/adapters/drizzle-account.repository.adapter.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  controllers: [AuthController],
  providers: [
    ...CommandHandlers,
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasherAdapter,
    },
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: DrizzleAccountRepositoryAdapter,
    },
  ],
})
export class AuthModule {}

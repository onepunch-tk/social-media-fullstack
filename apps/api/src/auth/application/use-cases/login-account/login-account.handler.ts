import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepositoryPort,
} from '#auth/application/ports/account.repository.port';
import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '#auth/application/ports/password-hasher.port';
import { SessionIssuer } from '#auth/application/services/session-issuer.service';
import { Email } from '#auth/domain/value-objects/email.vo';
import { ApplicationException } from '#shared/domain/exceptions/application.exception';
import { LoginAccountCommand } from './login-account.command';

@CommandHandler(LoginAccountCommand)
export class LoginAccountHandler implements ICommandHandler<LoginAccountCommand> {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(command: LoginAccountCommand) {
    const account = await this.accountRepository.findByEmail(Email.create(command.email));
    const matched =
      account !== null &&
      (await this.passwordHasher.compare(command.password, account.passwordHash.value));

    if (!matched) {
      throw invalidCredentials();
    }

    return this.sessions.issue(account.id);
  }
}

const invalidCredentials = () =>
  new ApplicationException('UNAUTHORIZED', '이메일 또는 비밀번호를 확인하세요.');

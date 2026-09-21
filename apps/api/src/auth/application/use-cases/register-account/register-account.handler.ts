import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, type ICommandHandler } from '@nestjs/cqrs';
import { SessionIssuer } from '#auth/application/services/session-issuer.service';
import { ApplicationException } from '#shared/domain/exceptions/application.exception';
import { Account } from '../../../domain/entities/account.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepositoryPort,
  DuplicateAccountError,
} from '../../ports/account.repository.port';
import { PASSWORD_HASHER, type PasswordHasherPort } from '../../ports/password-hasher.port';
import { RegisterAccountCommand } from './register-account.command';

@CommandHandler(RegisterAccountCommand)
export class RegisterAccountHandler implements ICommandHandler<RegisterAccountCommand> {
  constructor(
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepositoryPort,
    private readonly publisher: EventPublisher,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(command: RegisterAccountCommand) {
    const email = Email.create(command.email);

    if (await this.accountRepository.findByEmail(email)) {
      throw duplicateEmail();
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const account = this.publisher.mergeObjectContext(Account.register(email, passwordHash));

    try {
      await this.accountRepository.save(account);
    } catch (e) {
      if (e instanceof DuplicateAccountError) throw duplicateEmail();
      throw e;
    }

    account.commit();

    return this.sessions.issue(account.id);
  }
}

const duplicateEmail = () =>
  new ApplicationException('CONFLICT', '이미 사용 중인 이메일입니다.', 'email');

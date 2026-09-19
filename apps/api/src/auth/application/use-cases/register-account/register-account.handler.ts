import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, type ICommandHandler } from '@nestjs/cqrs';
import { ApplicationException } from '#shared/domain/exceptions/application.exception.js';
import { Account } from '../../../domain/entities/account.entity.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepositoryPort,
  DuplicateAccountError,
} from '../../ports/account.repository.port.js';
import { PASSWORD_HASHER, type PasswordHasherPort } from '../../ports/password-hasher.port.js';
import { RegisterAccountCommand } from './register-account.command.js';

@CommandHandler(RegisterAccountCommand)
export class RegisterAccountHandler implements ICommandHandler<RegisterAccountCommand, void> {
  constructor(
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
    @Inject(ACCOUNT_REPOSITORY) private readonly repository: AccountRepositoryPort,
    @Inject(EventPublisher) private readonly publisher: EventPublisher,
  ) {}

  async execute(command: RegisterAccountCommand): Promise<void> {
    const email = Email.create(command.email);

    if (await this.repository.findByEmail(email)) {
      throw duplicateEmail();
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const account = this.publisher.mergeObjectContext(Account.register(email, passwordHash));

    try {
      await this.repository.save(account);
    } catch (e) {
      if (e instanceof DuplicateAccountError) throw duplicateEmail();
      throw e;
    }

    account.commit();
  }
}

const duplicateEmail = () =>
  new ApplicationException('CONFLICT', '이미 사용 중인 이메일입니다.', 'email');

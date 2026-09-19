import type { Account } from '../../domain/entities/account.entity.js';
import type { AccountId } from '../../domain/value-objects/account-id.vo.js';
import type { Email } from '../../domain/value-objects/email.vo.js';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export class DuplicateAccountError extends Error {
  constructor(readonly field: 'email') {
    super(`이미 존재하는 이메일 주소 입니다.`);
    this.name = 'DuplicateAccountError';
  }
}

export interface AccountRepositoryPort {
  save(account: Account): Promise<void>;
  findById(accountId: AccountId): Promise<Account | null>;
  findByEmail(email: Email): Promise<Account | null>;
}

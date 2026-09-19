import { AggregateRoot } from '#shared/domain/aggregate-root.js';
import { AccountRegisteredEvent } from '../events/account-registered.event.js';
import { AccountId } from '../value-objects/account-id.vo.js';
import type { Email } from '../value-objects/email.vo.js';
import { PasswordHash } from '../value-objects/password-hash.vo.js';

type AccountProps = {
  id: AccountId;
  email: Email;
  passwordHash: PasswordHash;
  createdAt: Date;
  updatedAt: Date;
};

export class Account extends AggregateRoot {
  private readonly _id: AccountId;
  private readonly _email: Email;
  private readonly _passwordHash: PasswordHash;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  private constructor(props: AccountProps) {
    super();

    this._id = props.id;
    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  get id() {
    return this._id;
  }
  get email() {
    return this._email;
  }
  get passwordHash() {
    return this._passwordHash;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  static register(email: Email, passwordHash: string): Account {
    const now = new Date();
    const account = new Account({
      id: new AccountId(),
      email,
      passwordHash: PasswordHash.from(passwordHash),
      createdAt: now,
      updatedAt: now,
    });

    account.apply(new AccountRegisteredEvent(account.id.value, email.value, now));

    return account;
  }

  static reconstitute(props: AccountProps): Account {
    return new Account(props);
  }
}

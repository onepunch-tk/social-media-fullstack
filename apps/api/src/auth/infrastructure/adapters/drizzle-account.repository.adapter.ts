import { Inject, Injectable } from '@nestjs/common';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DRIZZLE } from '#shared/infrastructure/database/postgres/drizzle.module.js';
import {
  ACCOUNTS_EMAIL_UNIQUE,
  accounts,
} from '#shared/infrastructure/database/postgres/schema/account.schema.js';
import {
  type AccountRepositoryPort,
  DuplicateAccountError,
} from '../../application/ports/account.repository.port.js';
import { Account } from '../../domain/entities/account.entity.js';
import { AccountId } from '../../domain/value-objects/account-id.vo.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo.js';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class DrizzleAccountRepositoryAdapter implements AccountRepositoryPort {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase) {}

  async save(account: Account): Promise<void> {
    const row = DrizzleAccountRepositoryAdapter.toPersistence(account);

    try {
      await this.db
        .insert(accounts)
        .values(row)
        .onConflictDoUpdate({
          target: accounts.id,
          set: {
            email: row.email,
            passwordHash: row.passwordHash,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
        });
    } catch (e) {
      if (
        e instanceof DrizzleQueryError &&
        e.cause instanceof postgres.PostgresError &&
        e.cause.code === UNIQUE_VIOLATION &&
        e.cause.constraint_name === ACCOUNTS_EMAIL_UNIQUE
      ) {
        throw new DuplicateAccountError('email');
      }

      throw e;
    }
  }
  async findById(accountId: AccountId): Promise<Account | null> {
    const rows = await this.db.select().from(accounts).where(eq(accounts.id, accountId.value));
    if (rows.length === 0) return null;

    return rows[0] ? DrizzleAccountRepositoryAdapter.toDomain(rows[0]) : null;
  }
  async findByEmail(email: Email): Promise<Account | null> {
    const rows = await this.db.select().from(accounts).where(eq(accounts.email, email.value));
    if (rows.length === 0) return null;

    return rows[0] ? DrizzleAccountRepositoryAdapter.toDomain(rows[0]) : null;
  }

  private static toPersistence(account: Account): typeof accounts.$inferInsert {
    return {
      id: account.id.value,
      email: account.email.value,
      passwordHash: account.passwordHash.value,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private static toDomain(row: typeof accounts.$inferSelect): Account {
    return Account.reconstitute({
      id: new AccountId(row.id),
      email: Email.create(row.email),
      passwordHash: PasswordHash.from(row.passwordHash),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { eq, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  RefreshTokenAlreadyRotatedError,
  type RefreshTokenRepositoryPort,
} from '#auth/application/ports/refresh-token.repository.port';
import { RefreshToken } from '#auth/domain/entities/refresh-token.entity';
import { AccountId } from '#auth/domain/value-objects/account-id.vo';
import { UniqueId } from '#shared/domain/value-objects/unique-id.vo';
import { DRIZZLE } from '#shared/infrastructure/database/postgres/drizzle.module';
import { refreshTokens } from '#shared/infrastructure/database/postgres/schema/refresh-token.schema';

@Injectable()
export class DrizzleRefreshTokenRepositoryAdapter implements RefreshTokenRepositoryPort {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase) {}

  async save(token: RefreshToken): Promise<void> {
    await this.db
      .insert(refreshTokens)
      .values(DrizzleRefreshTokenRepositoryAdapter.toPersistence(token));
  }
  async findByHash(hash: string): Promise<RefreshToken | null> {
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash));
    return rows[0] ? DrizzleRefreshTokenRepositoryAdapter.toDomain(rows[0]) : null;
  }
  async replace(current: RefreshToken, next: RefreshToken): Promise<void> {
    await this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(refreshTokens)
        .where(eq(refreshTokens.id, current.id.value))
        .returning();

      // 레이스 방어 로직
      if (deleted.length === 0) throw new RefreshTokenAlreadyRotatedError('refreshToken');

      await tx
        .insert(refreshTokens)
        .values(DrizzleRefreshTokenRepositoryAdapter.toPersistence(next));
    });
  }

  async deleteExpired(now: Date): Promise<number> {
    const deleted = await this.db
      .delete(refreshTokens)
      .where(lte(refreshTokens.expiresAt, now))
      .returning({ id: refreshTokens.id });
    return deleted.length;
  }

  private static toPersistence(token: RefreshToken): typeof refreshTokens.$inferInsert {
    return {
      id: token.id.value,
      accountId: token.accountId.value,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    };
  }

  private static toDomain(row: typeof refreshTokens.$inferSelect): RefreshToken {
    return RefreshToken.reconstitute({
      id: new UniqueId(row.id),
      accountId: new AccountId(row.accountId),
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }
}

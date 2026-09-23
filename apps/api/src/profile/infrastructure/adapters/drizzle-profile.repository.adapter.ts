import { Inject } from '@nestjs/common';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Handle } from '#profile/domain/value-objects/handle.vo';
import { Name } from '#profile/domain/value-objects/name.vo';
import { DRIZZLE } from '#shared/infrastructure/database/postgres/drizzle.module';
import {
  PROFILES_HANDLE_UNIQUE,
  profiles,
} from '#shared/infrastructure/database/postgres/schema/profile.schema';
import {
  DuplicateHandleError,
  type ProfileRepositoryPort,
} from '../../application/ports/profile.repository.port';
import { Profile } from '../../domain/entities/profile.entity';
import { ProfileId } from '../../domain/value-objects/profile-id.vo';

const UNIQUE_VIOLATION = '23505';

export class DrizzleProfileRepositoryAdapter implements ProfileRepositoryPort {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase) {}

  async create(profile: Profile): Promise<void> {
    try {
      await this.db
        .insert(profiles)
        .values(DrizzleProfileRepositoryAdapter.toPersistence(profile))
        .onConflictDoNothing({ target: profiles.id });
    } catch (e) {
      if (DrizzleProfileRepositoryAdapter.isHandleConflict(e)) {
        throw new DuplicateHandleError('handle');
      }

      throw e;
    }
  }

  async save(profile: Profile): Promise<void> {
    const row = DrizzleProfileRepositoryAdapter.toPersistence(profile);

    try {
      await this.db
        .insert(profiles)
        .values(row)
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            name: row.name,
            avatarUrl: row.avatarUrl,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
        });
    } catch (e) {
      if (DrizzleProfileRepositoryAdapter.isHandleConflict(e)) {
        throw new DuplicateHandleError('handle');
      }

      throw e;
    }
  }

  async findById(profileId: ProfileId): Promise<Profile | null> {
    const rows = await this.db.select().from(profiles).where(eq(profiles.id, profileId.value));
    if (rows.length === 0) return null;

    return rows[0] ? DrizzleProfileRepositoryAdapter.toDomain(rows[0]) : null;
  }

  findAll(): Promise<Profile[]> {
    throw new Error('Method not implemented.');
  }

  private static toPersistence(profile: Profile): typeof profiles.$inferInsert {
    return {
      id: profile.id.value,
      handle: profile.handle.value,
      name: profile.name.value,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private static toDomain(row: typeof profiles.$inferSelect): Profile {
    return Profile.reconstitute({
      id: new ProfileId(row.id),
      handle: Handle.create(row.handle),
      name: Name.create(row.name),
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private static isHandleConflict(e: unknown): boolean {
    return (
      e instanceof DrizzleQueryError &&
      e.cause instanceof postgres.PostgresError &&
      e.cause.code === UNIQUE_VIOLATION &&
      e.cause.constraint_name === PROFILES_HANDLE_UNIQUE
    );
  }
}

import { Inject } from '@nestjs/common';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '#shared/infrastructure/database/postgres/drizzle.module';
import { profiles } from '#shared/infrastructure/database/postgres/schema/profile.schema';
import type { ProfileRepositoryPort } from '../../application/ports/profile.repository.port';
import type { Profile } from '../../domain/entities/profile.entity';
import type { ProfileId } from '../../domain/value-objects/profile-id.vo';

export class DrizzleProfileRepositoryAdapter implements ProfileRepositoryPort {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase) {}
  async save(profile: Profile): Promise<void> {
    const row = DrizzleProfileRepositoryAdapter.toPersistence(profile);

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
  }
  findById(_id: ProfileId): Promise<Profile | null> {
    throw new Error('Method not implemented.');
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
}

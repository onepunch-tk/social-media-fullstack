import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '#shared/infrastructure/database/drizzle/drizzle.module.js';
import type {
  DatabasePingPort,
  DatabasePingResult,
} from '../../application/ports/database-ping.port.js';

@Injectable()
export class DrizzleDatabasePingAdapter implements DatabasePingPort {
  constructor(@Inject(DRIZZLE) private readonly db: PostgresJsDatabase) {}

  async ping(): Promise<DatabasePingResult> {
    const startedAt = performance.now();
    try {
      await this.db.execute(sql`select 1`);
      return { ok: true, latencyMs: performance.now() - startedAt };
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      return { ok: false, latencyMs: performance.now() - startedAt, reason };
    }
  }
}

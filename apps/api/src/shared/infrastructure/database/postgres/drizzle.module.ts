import type { OnModuleDestroy } from '@nestjs/common';
import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../../config/env.schema';

export const DRIZZLE = Symbol('DRIZZLE');

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly client: postgres.Sql;
  private readonly instance: PostgresJsDatabase;

  constructor(config: ConfigService<Env, true>) {
    this.client = postgres(config.get('DATABASE_URL', { infer: true }), { max: 5 });
    this.instance = drizzle(this.client);
  }

  get db(): PostgresJsDatabase {
    return this.instance;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}

@Global()
@Module({
  providers: [
    DrizzleService,
    {
      provide: DRIZZLE,
      useFactory: (svc: DrizzleService) => svc.db,
      inject: [DrizzleService],
    },
  ],
  exports: [DRIZZLE, DrizzleService],
})
export class DrizzleModule {}

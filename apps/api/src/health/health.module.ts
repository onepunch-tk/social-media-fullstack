import { Module } from '@nestjs/common';
import { DATABASE_PING } from './application/ports/database-ping.port.js';
import { QueryHandlers } from './application/queries/handlers/index.js';
import { DrizzleDatabasePingAdapter } from './infrastructure/adapters/drizzle-database-ping.adapter.js';
import { HealthController } from './presentation/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [...QueryHandlers, { provide: DATABASE_PING, useClass: DrizzleDatabasePingAdapter }],
})
export class HealthModule {}

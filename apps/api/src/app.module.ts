import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { HealthModule } from '#health/health.module.js';
import { validateEnv } from '#shared/infrastructure/config/env.schema.js';
import { DrizzleModule } from '#shared/infrastructure/database/drizzle/drizzle.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    CqrsModule.forRoot(),
    DrizzleModule,
    HealthModule,
  ],
})
export class AppModule {}

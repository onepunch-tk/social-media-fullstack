import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '#auth/auth.module.js';
import { validateEnv } from '#shared/infrastructure/config/env.schema.js';
import { DrizzleModule } from '#shared/infrastructure/database/postgres/drizzle.module.js';
import { ApiExceptionFilter } from '#shared/infrastructure/filters/api-exception.filter.js';
import { createValidationPipe } from '#shared/infrastructure/pipes/validation.pipe.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    CqrsModule.forRoot(),
    DrizzleModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}

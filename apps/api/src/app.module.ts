import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '#auth/auth.module';
import { validateEnv } from '#shared/infrastructure/config/env.schema';
import { DrizzleModule } from '#shared/infrastructure/database/postgres/drizzle.module';
import { ApiExceptionFilter } from '#shared/infrastructure/filters/api-exception.filter';
import { createValidationPipe } from '#shared/infrastructure/pipes/validation.pipe';
import { PostModule } from './post/post.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    DrizzleModule,
    AuthModule,
    PostModule,
  ],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Env } from '#shared/infrastructure/config/env.schema';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.enableShutdownHooks();
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();

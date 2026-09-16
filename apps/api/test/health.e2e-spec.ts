import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthResponseSchema } from '@social/schemas';
import request from 'supertest';
import type { DatabasePingPort } from '#health/application/ports/database-ping.port.js';
import { DATABASE_PING } from '#health/application/ports/database-ping.port.js';
import { AppModule } from '../src/app.module.js';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

describe('GET /health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(validationPipe);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with a HealthResponse whose first check is the database', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    const body = HealthResponseSchema.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.checks[0]?.name).toBe('database');
    expect(body.checks[0]?.status).toBe('ok');
  });
});

describe('GET /health (e2e, database unreachable)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const failingPing: DatabasePingPort = {
      ping: async () => ({ ok: false, latencyMs: 1, reason: 'connection refused' }),
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_PING)
      .useValue(failingPing)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(validationPipe);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 503 with status degraded and a failed database check', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(503);

    const body = HealthResponseSchema.parse(response.body);
    expect(body.status).toBe('degraded');
    expect(body.checks[0]?.name).toBe('database');
    expect(body.checks[0]?.status).toBe('fail');
  });
});

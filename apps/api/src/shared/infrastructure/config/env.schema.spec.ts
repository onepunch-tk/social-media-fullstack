import { validateEnv } from './env.schema.js';

describe('validateEnv', () => {
  it('parses DATABASE_URL and defaults PORT to 3000', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/social_media',
      CORS_ORIGIN: 'http://localhost:8081',
    });

    expect(env).toEqual({
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/social_media',
      PORT: 3000,
      CORS_ORIGIN: ['http://localhost:8081'],
    });
  });

  it('throws when DATABASE_URL is missing or malformed', () => {
    expect(() => validateEnv({ CORS_ORIGIN: 'http://localhost:8081' })).toThrow();
    expect(() =>
      validateEnv({ DATABASE_URL: 'not-a-url', CORS_ORIGIN: 'http://localhost:8081' }),
    ).toThrow();
  });

  it('splits comma-separated CORS_ORIGIN into a trimmed list', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/social_media',
      CORS_ORIGIN: 'http://localhost:8081, http://192.168.0.10:8081',
    });

    expect(env.CORS_ORIGIN).toEqual(['http://localhost:8081', 'http://192.168.0.10:8081']);
  });

  it('throws when CORS_ORIGIN is missing, empty, or contains a non-URL', () => {
    const DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/social_media';
    expect(() => validateEnv({ DATABASE_URL })).toThrow();
    expect(() => validateEnv({ DATABASE_URL, CORS_ORIGIN: '' })).toThrow();
    expect(() => validateEnv({ DATABASE_URL, CORS_ORIGIN: '*' })).toThrow();
  });
});

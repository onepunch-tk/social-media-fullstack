import { validateEnv } from './env.schema.js';

describe('validateEnv', () => {
  it('parses DATABASE_URL and defaults PORT to 3000', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/social_media',
    });

    expect(env).toEqual({
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/social_media',
      PORT: 3000,
    });
  });

  it('throws when DATABASE_URL is missing or malformed', () => {
    expect(() => validateEnv({})).toThrow();
    expect(() => validateEnv({ DATABASE_URL: 'not-a-url' })).toThrow();
  });
});

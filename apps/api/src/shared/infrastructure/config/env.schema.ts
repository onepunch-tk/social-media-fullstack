import * as z from 'zod';

export const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3000),
  // 콤마 구분 허용 origin 목록 (예: http://localhost:8081,http://192.168.0.10:8081). 와일드카드 없음.
  CORS_ORIGIN: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return EnvSchema.parse(config);
}

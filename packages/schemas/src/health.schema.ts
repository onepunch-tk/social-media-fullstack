import * as z from 'zod';

export const HealthCheckSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['ok', 'fail']),
  latencyMs: z.number().nonnegative().optional(),
});

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.iso.datetime(),
  checks: z.array(HealthCheckSchema),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR', // 400
  'UNAUTHORIZED', // 401
  'FORBIDDEN', // 403
  'NOT_FOUND', // 404
  'CONFLICT', // 409 유일성 위반
  'INTERNAL_ERROR', // 500 미분류
]);

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

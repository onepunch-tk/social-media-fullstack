import { z } from 'zod';

export const AccountFieldsLimits = {
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 64,
  passwordMaxBytes: 72, // bcrypt가 72바이트 이후를 조용히 버린다
} as const;

export const AccountFieldsMessage = {
  emailRequired: '이메일을 입력하세요.',
  emailInvalid: '올바른 이메일 형식을 입력하세요.',
  emailTooLong: '이메일은 254자 이하여야 합니다.',
  passwordTooShort: '비밀번호는 8자 이상이어야 합니다.',
  passwordTooLong: '비밀번호는 64자 이하여야 합니다.',
} as const;

export const SessionFieldsLimits = {
  refreshTokenMin: 1,
} as const;

export const SessionFieldsMessage = {
  refreshTokenRequired: '갱신 토큰을 입력하세요.',
} as const;

export const AccountSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: AccountFieldsMessage.emailRequired })
    .pipe(
      z
        .email({ error: AccountFieldsMessage.emailInvalid })
        .max(AccountFieldsLimits.emailMax, { error: AccountFieldsMessage.emailTooLong }),
    ),
  password: z
    .string()
    .min(AccountFieldsLimits.passwordMin, { error: AccountFieldsMessage.passwordTooShort })
    .max(AccountFieldsLimits.passwordMax, { error: AccountFieldsMessage.passwordTooLong })
    .refine((v) => new TextEncoder().encode(v).length <= AccountFieldsLimits.passwordMaxBytes, {
      error: AccountFieldsMessage.passwordTooLong,
    }),
});

export const RefreshSessionSchema = z.object({
  refreshToken: z
    .string()
    .min(SessionFieldsLimits.refreshTokenMin, { error: SessionFieldsMessage.refreshTokenRequired }),
});

export const AuthSessionSchema = z.object({
  accountId: z.uuid(),
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type Account = z.infer<typeof AccountSchema>;
export type AuthSessionResponse = z.infer<typeof AuthSessionSchema>;
export type RefreshSession = z.infer<typeof RefreshSessionSchema>;

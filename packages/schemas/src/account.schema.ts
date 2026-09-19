import { z } from 'zod';

export const RegisterAccountLimits = {
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 64,
  passwordMaxBytes: 72, // bcrypt가 72바이트 이후를 조용히 버린다
} as const;

export const RegisterAccountMessage = {
  emailRequired: '이메일을 입력하세요.',
  emailInvalid: '올바른 이메일 형식을 입력하세요.',
  emailTooLong: '이메일은 254자 이하여야 합니다.',
  passwordTooShort: '비밀번호는 8자 이상이어야 합니다.',
  passwordTooLong: '비밀번호는 64자 이하여야 합니다.',
};

export const RegisterAccountSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: RegisterAccountMessage.emailRequired })
    .pipe(
      z
        .email({ error: RegisterAccountMessage.emailInvalid })
        .max(RegisterAccountLimits.emailMax, { error: RegisterAccountMessage.emailTooLong }),
    ),
  password: z
    .string()
    .min(RegisterAccountLimits.passwordMin, { error: RegisterAccountMessage.passwordTooShort })
    .max(RegisterAccountLimits.passwordMax, { error: RegisterAccountMessage.passwordTooLong })
    .refine((v) => new TextEncoder().encode(v).length <= RegisterAccountLimits.passwordMaxBytes, {
      error: RegisterAccountMessage.passwordTooLong,
    }),
});

export type RegisterAccount = z.infer<typeof RegisterAccountSchema>;

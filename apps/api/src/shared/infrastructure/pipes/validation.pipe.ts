import { type ValidationError, ValidationPipe } from '@nestjs/common';

export class RequestValidationException extends Error {
  constructor(readonly fields: Record<string, string>) {
    super('입력값을 확인하세요.');
  }
}

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new RequestValidationException(flatten(errors)),
  });
}

function flatten(errors: ValidationError[], prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};

  for (const e of errors) {
    const path = prefix ? `${prefix}.${e.property}` : e.property; // 중첩 DTO -> "address.city" (RHF 경로 표기와 동일)
    if (e.constraints) {
      out[path] = Object.values(e.constraints)[0] ?? 'unknown error';
    }
    if (e.children?.length) Object.assign(out, flatten(e.children, path));
  }

  return out;
}

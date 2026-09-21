import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../reqest.type';

export const CurrentAccountId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.accountId;
});

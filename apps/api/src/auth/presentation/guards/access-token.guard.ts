import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { VerifySessionQuery } from '#auth/application/queries/verify-session.query';
import { IS_PUBLIC } from '#shared/presentation/decorators/public.decorator';
import type { AuthenticatedRequest } from '#shared/presentation/reqest.type';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly queryBus: QueryBus,
  ) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException('인증이 필요합니다.');

    const session = await this.queryBus.execute(new VerifySessionQuery(token));
    if (!session) throw new UnauthorizedException('로그인이 만료되었습니다. 다시 로그인해주세요.');

    request.accountId = session.accountId;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

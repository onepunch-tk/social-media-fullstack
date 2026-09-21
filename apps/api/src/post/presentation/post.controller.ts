import { Controller, Get } from '@nestjs/common';
import { CurrentAccountId } from '#shared/presentation/decorators/current-account-id.decorator';

@Controller('posts')
export class PostController {
  @Get()
  authGuardTest(@CurrentAccountId() accountId: string) {
    return `hello world: ${accountId}`;
  }
}

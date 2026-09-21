import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { LoginAccountCommand } from '#auth/application/use-cases/login-account/login-account.command';
import { RefreshSessionCommand } from '#auth/application/use-cases/refresh-session/refresh-session.command';
import { Public } from '#shared/presentation/decorators/public.decorator';
import { RegisterAccountCommand } from '../application/use-cases/register-account/register-account.command';
import { AccountDto } from './dtos/account.dto';
import { AuthSessionResponseDto } from './dtos/auth-session-response.dto';
import { RefreshSessionDto } from './dtos/refresh-session.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post()
  async register(@Body() dto: AccountDto): Promise<AuthSessionResponseDto> {
    const session = await this.commandBus.execute(
      new RegisterAccountCommand(dto.email, dto.password),
    );

    return AuthSessionResponseDto.from(session);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Public()
  @Post('login')
  async login(@Body() dto: AccountDto): Promise<AuthSessionResponseDto> {
    const session = await this.commandBus.execute(new LoginAccountCommand(dto.email, dto.password));
    return AuthSessionResponseDto.from(session);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshSessionDto): Promise<AuthSessionResponseDto> {
    const session = await this.commandBus.execute(new RefreshSessionCommand(dto.refreshToken));
    return AuthSessionResponseDto.from(session);
  }
}

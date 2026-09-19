import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RegisterAccountCommand } from '../application/use-cases/register-account/register-account.command.js';
import { RegisterAccountDto } from './dtos/register-account.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  async register(@Body() dto: RegisterAccountDto) {
    return this.commandBus.execute<RegisterAccountCommand, void>(
      new RegisterAccountCommand(dto.email, dto.password),
    );
  }
}

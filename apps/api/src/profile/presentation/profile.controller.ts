import { Controller, Get } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EnsureProfileCommand } from '#profile/application/use-cases/ensure-profile/ensure-profile.command';
import { CurrentAccountId } from '#shared/presentation/decorators/current-account-id.decorator';
import { ProfileResponseDto } from './dtos/profile-response.dto';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly commandBus: CommandBus) {}

  @Get('me')
  async me(@CurrentAccountId() accountId: string): Promise<ProfileResponseDto> {
    return ProfileResponseDto.fromDomain(
      await this.commandBus.execute(new EnsureProfileCommand(accountId)),
    );
  }
}

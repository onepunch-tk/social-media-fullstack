import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  DuplicateHandleError,
  PROFILE_REPOSITORY,
  type ProfileRepositoryPort,
} from '#profile/application/ports/profile.repository.port';
import { Profile } from '#profile/domain/entities/profile.entity';
import { ProfileId } from '#profile/domain/value-objects/profile-id.vo';
import { ApplicationException } from '#shared/domain/exceptions/application.exception';
import { EnsureProfileCommand } from './ensure-profile.command';

@CommandHandler(EnsureProfileCommand)
export class EnsureProfileHandler implements ICommandHandler<EnsureProfileCommand> {
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profileRepository: ProfileRepositoryPort,
  ) {}

  async execute(command: EnsureProfileCommand): Promise<Profile> {
    const profileId = new ProfileId(command.accountId);

    const existing = await this.profileRepository.findById(profileId);
    if (existing) return existing;

    await this.createDefault(profileId);

    const profile = await this.profileRepository.findById(profileId);
    if (!profile) throw new ApplicationException('NOT_FOUND', '유저의 프로필을 찾을 수 없습니다.');

    return profile;
  }

  private async createDefault(profileId: ProfileId): Promise<void> {
    for (let attempt = 0; attempt < this.MAX_ATTEMPTS; attempt++) {
      try {
        await this.profileRepository.create(Profile.createDefault(profileId));
        return;
      } catch (e) {
        if (!(e instanceof DuplicateHandleError)) throw e;
      }
    }

    throw duplicateHandle();
  }
}

const duplicateHandle = () =>
  new ApplicationException('CONFLICT', '기본 handle 생성에 실패했습니다.', 'handle');

import type { AuthSessionResponse } from '@social/schemas';
import { AuthSession } from '#auth/application/services/session-issuer.service';

export class AuthSessionResponseDto implements AuthSessionResponse {
  accountId: string;
  accessToken: string;
  refreshToken: string;

  static from(authSession: AuthSession): AuthSessionResponseDto {
    const dto = new AuthSessionResponseDto();

    dto.accountId = authSession.accountId;
    dto.accessToken = authSession.accessToken;
    dto.refreshToken = authSession.refreshToken;

    return dto;
  }
}

import {
  SessionFieldsLimits as L,
  SessionFieldsMessage as M,
  type RefreshSession,
} from '@social/schemas';
import { IsString, MinLength } from 'class-validator';

export class RefreshSessionDto implements RefreshSession {
  @IsString()
  @MinLength(L.refreshTokenMin, { message: M.refreshTokenRequired })
  refreshToken: string;
}

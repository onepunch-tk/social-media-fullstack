import { LoginAccountHandler } from './login-account/login-account.handler';
import { PurgeExpiredRefreshTokenHandler } from './purge-expired-refresh-token/purge-expired-refresh-token.handler';
import { RefreshSessionHandler } from './refresh-session/refresh-session.handler';
import { RegisterAccountHandler } from './register-account/register-account.handler';

export const CommandHandlers = [
  RegisterAccountHandler,
  LoginAccountHandler,
  RefreshSessionHandler,
  PurgeExpiredRefreshTokenHandler,
];

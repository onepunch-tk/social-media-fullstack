import { type Account, AccountFieldsLimits as L, AccountFieldsMessage as M } from '@social/schemas';
import { IsByteLength, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AccountDto implements Account {
  @IsEmail({}, { message: M.emailInvalid })
  @MaxLength(L.emailMax, { message: M.emailTooLong })
  @IsNotEmpty({ message: M.emailRequired })
  email: string;

  @IsString()
  @MinLength(L.passwordMin, { message: M.passwordTooShort })
  @MaxLength(L.passwordMax, { message: M.passwordTooLong })
  @IsByteLength(0, L.passwordMaxBytes, { message: M.passwordTooLong })
  password: string;
}

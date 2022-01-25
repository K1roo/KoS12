import {Transform} from 'class-transformer';
import {IsEmail, IsJWT, IsOptional} from 'class-validator';

import {KosLoginTicket} from '../../../../../agnostic/kos-lib/src/auth/kos-login-ticket';

export class LoginWithEmailBodyDto {
  @IsOptional()
  @IsEmail()
  @Transform((email?: string) =>
    typeof email === 'string' ? email.trim().toLowerCase() : email,
  )
  public email?: string;

  @IsOptional()
  @IsJWT()
  public loginTicket?: KosLoginTicket;
}

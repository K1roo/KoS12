import {Transform} from 'class-transformer';
import {
  IsJWT,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

import {KosLoginTicket} from '../../../../../agnostic/kos-lib/src/auth/kos-login-ticket';

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsNumberString()
  public code!: string;

  @IsOptional()
  @IsString()
  @Transform((nickname?: string) =>
    typeof nickname === 'string' ? nickname.trim() : nickname,
  )
  public nickname?: string;

  @IsOptional()
  @IsUrl()
  public avatar?: string;

  @IsOptional()
  @IsJWT()
  public loginTicket?: KosLoginTicket;
}

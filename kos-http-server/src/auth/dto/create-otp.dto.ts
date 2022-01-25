import {IsNotEmpty, IsEmail, IsString} from 'class-validator';

import {UserEntity} from '../../../../business/users/user.entity';

export class CreateOtpDto {
  @IsNotEmpty()
  @IsEmail()
  public email!: string;

  @IsNotEmpty()
  public user!: UserEntity;

  @IsNotEmpty()
  @IsString()
  public code!: string;
}

import {IsNotEmpty, IsString} from 'class-validator';

import {KosRefreshToken} from '../../../../../agnostic/kos-lib/src/data/jwt/kos-refresh-token';
import {UserEntity} from '../../../../business/users/user.entity';

export class CreateRefreshTokenDto {
  @IsNotEmpty()
  public user!: UserEntity;

  @IsNotEmpty()
  @IsString()
  public token!: KosRefreshToken;
}

import {Injectable, HttpException, HttpStatus} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';

import {UserEntity} from '../../../../business/users/user.entity';
import {UsersService} from '../../../../business/users/users.service';
import httpServerConfig from '../../../../kos-config/http-server/configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  public constructor(private readonly _usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: httpServerConfig.jwtSecret,
    });
  }

  // TODO: create DTO for jwt payload
  public async validate(payload: any): Promise<UserEntity> {
    const user = await this._usersService.getUserById(payload.userId);
    if (!user) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }
}

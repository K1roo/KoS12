import {Injectable} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {Strategy} from 'passport-twitch-new';

import {WinstonLogger} from '../../../../common/logger/logger.service';
import httpServerConfig from '../../../../kos-config/http-server/configuration';

@Injectable()
export class TwitchAuthStrategy extends PassportStrategy(
  Strategy,
  'twitch-identity',
) {
  public constructor() {
    super(httpServerConfig.twitchAuth);
    this._logger = new WinstonLogger('TwitchIdentityStrategy');
  }

  public async validate(
    twitchAccessToken: string,
    twitchRefreshToken: string,
    twitchProfile: any,
    done: (err: any, user: any) => void,
  ): Promise<any> {
    this._logger.verbose('Retrieved Twitch profile', {
      twitchAccessToken,
      twitchRefreshToken,
      twitchProfile,
    });

    twitchProfile['extra'] = {
      twitchAccessToken,
      twitchRefreshToken,
    };

    done(null, twitchProfile);
  }
}

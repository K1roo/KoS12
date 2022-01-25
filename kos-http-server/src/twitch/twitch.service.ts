/* eslint-disable @typescript-eslint/naming-convention */
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {default as axios} from 'axios';

import {RedisRepository} from '../../../common/redis/redis.repository';
import httpConf from '../../../kos-config/http-server/configuration';

import {TwitchStreamsResponse} from './interfaces/streams-response.interface';
import {TwitchAppAccessTokenResponse} from './interfaces/token-response.interface';

@Injectable()
export class TwitchService {
  private _streamsUrl = 'https://api.twitch.tv/helix/streams';
  private _tokenUrl = 'https://id.twitch.tv/oauth2/token';
  private _appAccessToken: string | null = null;

  public constructor(private readonly _redisRepository: RedisRepository) {}

  public getChannels = async (): Promise<TwitchStreamsResponse[] | []> => {
    await this.getAppToken();

    if (!this._appAccessToken) {
      throw new HttpException(
        'Server error: Missing twitch app access token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const response = await axios.get<TwitchStreamsResponse[] | []>(
      this._streamsUrl,
      {
        headers: {
          'Client-Id': httpConf.twitchAuth.clientID,
          Authorization: `Bearer ${this._appAccessToken}`,
        },
      },
    );

    return response.data;
  };

  public getAppToken = async (): Promise<void> => {
    if (!this._appAccessToken) {
      const token = await this._redisRepository.getTwitchAppAccessToken();
      this._appAccessToken = token || ((await this.fetchAppToken()) as string);
    }
  };

  public fetchAppToken = async (): Promise<string | HttpException> => {
    try {
      const response = await axios.post<TwitchAppAccessTokenResponse>(
        this._tokenUrl,
        {
          client_id: httpConf.twitchAuth.clientID,
          client_secret: httpConf.twitchAuth.clientSecret,
          grant_type: 'client_credentials',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      await this._redisRepository.setTwitchAppAccessToken(response.data);
      return response.data.access_token;
    } catch (e) {
      const {status, message} = e.response.data;
      return new HttpException(
        message || 'Server error',
        status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  };
}

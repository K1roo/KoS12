import {EntityRepository, Repository} from 'typeorm';

import {KosRefreshToken} from '../../../../agnostic/kos-lib/src/data/jwt/kos-refresh-token';
import {UserEntity} from '../../../business/users/user.entity';
import {WinstonLogger} from '../../../common/logger/logger.service';

import {CreateRefreshTokenDto} from './dto/create-refresh-token.dto';
import {RefreshTokenEntity} from './refresh-token.entity';

@EntityRepository(RefreshTokenEntity)
export class RefreshTokenRepository extends Repository<RefreshTokenEntity> {
  private _logger: WinstonLogger;
  public constructor() {
    super();
    this._logger = new WinstonLogger('RefreshTokenRepository');
  }

  public async getRefreshToken(
    token: string,
  ): Promise<RefreshTokenEntity | undefined> {
    const refreshToken = await this.findOne({
      where: {token},
      relations: ['user'],
    });
    this._logger.verbose('Got refresh token by token', {
      token,
      refreshToken,
    });
    return refreshToken;
  }

  public async getRefreshTokenByUserAndToken(
    user: UserEntity,
    token?: string,
  ): Promise<RefreshTokenEntity | undefined> {
    const refreshToken = await this.findOne({
      where: {user, token},
      // relations: ['user'],
    });
    this._logger.verbose('Got refresh token by user', {
      user,
      refreshToken,
    });
    return refreshToken;
  }

  public async updateRefreshToken(
    refreshToken: RefreshTokenEntity,
    newToken: KosRefreshToken,
  ): Promise<RefreshTokenEntity> {
    refreshToken.token = newToken;
    // TODO: set updatedAt
    await refreshToken.save();
    this._logger.verbose('Updated refresh token', {
      refreshToken,
      newToken,
    });
    return refreshToken;
  }

  public async createRefreshToken(
    refreshTokenData: CreateRefreshTokenDto,
  ): Promise<RefreshTokenEntity> {
    const {user, token} = refreshTokenData;
    const refreshToken = new RefreshTokenEntity();
    refreshToken.user = user;
    refreshToken.token = token;
    const createdRefreshToken = await refreshToken.save();
    this._logger.verbose('New refresh token created', {
      createdRefreshToken,
      refreshTokenData,
    });
    return createdRefreshToken;
  }
}

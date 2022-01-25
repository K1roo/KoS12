import {Injectable, HttpException, HttpStatus} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {JwtService} from '@nestjs/jwt';
import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {InjectRepository} from '@nestjs/typeorm';
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from 'unique-names-generator';
import {v4 as uuidv4} from 'uuid';

import {KosAccessToken} from '../../../../agnostic/kos-lib/src/auth/kos-access-token';
import {KosAccessTokenPayload} from '../../../../agnostic/kos-lib/src/auth/kos-access-token.payload';
import {KosLoginTicket} from '../../../../agnostic/kos-lib/src/auth/kos-login-ticket';
import {KosLoginTicketPayload} from '../../../../agnostic/kos-lib/src/auth/kos-login-ticket.payload';
import {kosWhitelistedAppIdsToCreateUser} from '../../../../agnostic/kos-lib/src/auth/kos-whitelisted-app-ids-to-create-user';
import {KosRefreshToken} from '../../../../agnostic/kos-lib/src/data/jwt/kos-refresh-token';
import {KosUserId} from '../../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {KosClientAppId} from '../../../../agnostic/kos-lib/src/kos-client-app-id';
import {IsoDateString} from '../../../../agnostic/native/iso-date-string';
import {WsConnectionId} from '../../../../agnostic/native/ws-connection-id';
import {IdentitiesService} from '../../../business/identities/identities.service';
import {IdentityEntity} from '../../../business/identities/identity.entity';
import {CreateUserDto} from '../../../business/users/dto/create-user.dto';
import {UserEntity} from '../../../business/users/user.entity';
import {UsersService} from '../../../business/users/users.service';
import {WinstonLogger} from '../../../common/logger/logger.service';
import {ModerationService} from '../../../common/moderation/moderation.service';
import {SesService} from '../../../common/ses/ses.service';
import {Environments} from '../../../common/types/environments';
import {
  EMIT_CHANGES,
  KOS_USER,
  USER_STATE,
} from '../../../common/types/event-emitter-keys';
import {UserEmitState} from '../../../common/types/users/user-emit-state';
import {SystemEvents} from '../../../common/types/ws/system-events';
import httpConf from '../../../kos-config/http-server/configuration';
import redisConfig from '../../../kos-config/redis/configuration';

import {LoginWithEmailBodyDto} from './dto/login-with-email-body.dto';
import {VerifyOtpDto} from './dto/verify-otp.dto';
import {Platforms} from './enums/platforms.enum';
import {OtpRepository} from './otp.repository';
import {RefreshTokenEntity} from './refresh-token.entity';
import {RefreshTokenRepository} from './refresh-token.repository';

const clientOptions: ClientOptions = {
  transport: Transport.REDIS,
  options: redisConfig,
};

@Injectable()
export class AuthService {
  private readonly _logger = new WinstonLogger(AuthService.name);
  private readonly _client: ClientProxy;

  public constructor(
    private readonly _usersService: UsersService,
    private readonly _identitiesService: IdentitiesService,
    private readonly _jwtService: JwtService,
    @InjectRepository(OtpRepository)
    private _otpRepository: OtpRepository,
    @InjectRepository(RefreshTokenRepository)
    private _refreshTokenRepository: RefreshTokenRepository,
    private _sesService: SesService,
    private _moderationService: ModerationService,
    private _eventEmitter: EventEmitter2,
  ) {
    this._client = ClientProxyFactory.create(clientOptions);
  }

  public async loginWithEmail(
    userData: LoginWithEmailBodyDto,
    refreshTokenFromCookie?: KosRefreshToken,
    // TODO: create interface
  ): Promise<any> {
    // TODO: create separate DTO?
    this._logger.verbose('Login with email', {
      userData,
      refreshTokenFromCookie,
    });
    if (!userData.email) {
      throw new HttpException('Email must be provided', HttpStatus.BAD_REQUEST);
    }

    let user;
    let creator = false;
    // try to get user from DB by provided email
    user = await this._usersService.getUserByEmail(userData.email);
    if (!user) {
      if (userData.loginTicket) {
        // get user by login ticket if it was passed
        // TODO: consider to implement tracking of login/refresh tickets usage
        try {
          const payload = this._jwtService.verify(userData.loginTicket, {
            secret: httpConf.loginTicketSecret,
          }) as KosLoginTicketPayload;
          if (payload.userId) {
            user = await this._usersService.getUserById(payload.userId);
          }
          if (payload.originApp === 'kos-broadcast') {
            creator = true;
          }
          this._logger.verbose('User by login ticket res', {user});
        } catch (error) {
          throw new HttpException('Bad login ticket', HttpStatus.UNAUTHORIZED);
        }
      }
    }

    // create a new user user (if not found in previous steps)
    if (!user) {
      const creationData: CreateUserDto = {
        anonymousName: uniqueNamesGenerator({
          dictionaries: [adjectives, animals],
          length: 2,
          separator: ' ',
          style: 'capital',
        }),
        creator,
      };
      user = await this._usersService.createUser(creationData);
    }

    // clean previous OTP(s) from DB
    await this._otpRepository.deleteOtpsByEmail(userData.email);

    // create OTP and save it in the DB

    let code = Math.floor(100000 + Math.random() * 900000).toString();
    // set fixed code for a twitch reviewer
    if (userData.email === 'dx-review@justin.tv') {
      code = '123456';
    }

    // TODO: consider storing OTP in redis with expiration
    await this._otpRepository.createOtp({
      email: userData.email,
      user,
      code,
    });

    if (
      [Environments.PRODUCTION, Environments.STAGING].includes(
        process.env.NODE_ENV as Environments,
      )
    ) {
      await this._sesService.sendOtpEmail(userData.email, code);
    }

    return {
      // TODO: remove code from the response
      message: `OTP has been sent to your email${
        process.env.NODE_ENV === Environments.PRODUCTION ? '' : ` ${code}`
      }`,
    };
  }

  public async useLoginTicket(
    loginTicket: KosLoginTicket,
    newUserId: KosUserId,
  ): Promise<KosUserId | null> {
    let prevUserId: KosUserId | null = null;
    try {
      const payload: KosLoginTicketPayload = this._jwtService.verify(
        loginTicket,
        {
          secret: httpConf.loginTicketSecret,
        },
      );
      if (payload.userId) {
        prevUserId = payload.userId;
      }
      this._client.emit<
        SystemEvents.LOGIN_TICKET_USED,
        {
          prevUserId: KosUserId | null;
          newUserId: KosUserId;
          connectionId: WsConnectionId;
          originApp: KosClientAppId | null;
        }
      >(SystemEvents.LOGIN_TICKET_USED, {
        prevUserId,
        newUserId,
        connectionId: payload.connectionId,
        originApp: payload.originApp,
      });
      // TODO: implement deleting temporary anonymous user
    } catch (error) {
      this._logger.warn('Error while processing login ticket', {
        loginTicket,
        newUserId,
      });
      this._logger.error(error);
    }
    return prevUserId;
  }

  public async verifyOtp(
    verifyOtpData: VerifyOtpDto,
    email?: string,
    refreshTokenFromCookie?: string,
  ): Promise<any> {
    // check that email was passed from the cookie
    if (!email) {
      throw new HttpException(
        'Email is not set in cookies',
        HttpStatus.BAD_REQUEST,
      );
    }

    // try to get OTP from the DB
    const otp = await this._otpRepository.getOtpByEmailAndCode(
      email,
      verifyOtpData.code,
    );

    if (!otp) {
      throw new HttpException(
        'Provided OTP is not valid',
        HttpStatus.FORBIDDEN,
      );
    }

    let updateUser = false;
    const dataToSend: UserEmitState = {id: otp.user.id};

    // set email for a user (if not set)
    if (!otp.user.email) {
      otp.user.email = email;
      updateUser = true;
    }

    // mark user as verified
    if (!otp.user.emailVerified) {
      otp.user.emailVerified = true;
      updateUser = true;
      dataToSend.emailVerified = true;
    }

    if (verifyOtpData.nickname) {
      const validationRes = await this._moderationService.validateUserName(
        verifyOtpData.nickname,
      );
      if (validationRes.message) {
        throw new HttpException(validationRes.message, HttpStatus.BAD_REQUEST);
      }
      otp.user.name = verifyOtpData.nickname.trim();
      updateUser = true;
      dataToSend.name = otp.user.name;
    }

    if (verifyOtpData.avatar) {
      const valid = await this._moderationService.validateAvatar(
        verifyOtpData.avatar,
      );
      if (!valid) {
        throw new HttpException('Bad avatar link', HttpStatus.BAD_REQUEST);
      }
      otp.user.picture = verifyOtpData.avatar;
      updateUser = true;
      dataToSend.picture = otp.user.picture;
    }

    if (updateUser) {
      await otp.user.save();
      this._eventEmitter.emit(`${KOS_USER}.${USER_STATE}.${EMIT_CHANGES}`, [
        dataToSend,
      ]);
    }
    // generate access token
    const payload: KosAccessTokenPayload = {
      userId: otp.user.id,
      creator: otp.user.creator,
      verified: !!otp.user.email,
    };
    const accessToken = this._jwtService.sign(payload);

    // generate new refresh token and save it to DB
    const token = uuidv4() as KosRefreshToken;
    let refreshToken;
    refreshToken =
      await this._refreshTokenRepository.getRefreshTokenByUserAndToken(
        otp.user,
        refreshTokenFromCookie,
      );
    if (refreshToken) {
      refreshToken = await this._refreshTokenRepository.updateRefreshToken(
        refreshToken,
        token,
      );
    } else {
      refreshToken = await this._refreshTokenRepository.createRefreshToken({
        user: otp.user,
        token,
      });
    }

    // delete temp anonymous user (if refresh token was provided)
    if (refreshTokenFromCookie) {
      const anonRefreshToken =
        await this._refreshTokenRepository.getRefreshToken(
          refreshTokenFromCookie,
        );
      // check that the user is really temp and anonymous
      if (
        anonRefreshToken &&
        anonRefreshToken.user &&
        !anonRefreshToken.user.email &&
        anonRefreshToken.user.id !== otp.user.id
      ) {
        const userIdToDelete = anonRefreshToken.user.id;
        await anonRefreshToken.remove();
        await this._usersService.deleteUserById(userIdToDelete);
      }
    }

    // clean OTP(s) from DB
    await this._otpRepository.deleteOtpsByEmail(email);

    if (verifyOtpData.loginTicket) {
      try {
        const prevUserId = await this.useLoginTicket(
          verifyOtpData.loginTicket,
          otp.user.id,
        );
        // TODO: implement deleting temporary anonymous user
        try {
          if (prevUserId && prevUserId !== otp.user.id) {
            await this._usersService.updateUserById(prevUserId, {
              newUserId: otp.user.id,
            });
          }
        } catch (error) {
          this._logger.warn('Error while setting newUserId column', {
            verifyOtpData,
            otp,
          });
          this._logger.error(error);
        }
      } catch (error) {
        this._logger.warn('Error while processing login ticket', {
          verifyOtpData,
        });
        this._logger.error(error);
      }
    }
    return {
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  public async refreshToken(
    passedRefreshToken?: string,
    passedAppId?: KosClientAppId,
    loginTicket?: KosLoginTicket,
  ): Promise<{accessToken: KosAccessToken; refreshToken: KosRefreshToken}> {
    if (!loginTicket && !passedRefreshToken) {
      throw new HttpException(
        'No refresh token provided',
        HttpStatus.UNAUTHORIZED,
      );
    }
    let user: UserEntity;
    let refreshToken: RefreshTokenEntity | undefined;
    if (loginTicket) {
      /**
       * if loginTicket is passed it means the user comes from the extension
       *
       * if it is not an anonymous user the system should log in the user
       * which is provided in the payload
       *
       * if it is an anonymous user the system should
       * 1) return 401 and force a user to enter an email;
       * 2) store this loginTicket in the cookies
       * 3) log in him later on otp verification
       *    using stored in cookies loginTicket
       */
      this._logger.verbose('Login ticket was passed', {
        loginTicket,
        passedRefreshToken,
        passedAppId,
      });
      const payload = this._jwtService.verify(loginTicket, {
        secret: httpConf.loginTicketSecret,
      }) as KosLoginTicketPayload;
      if (!payload.userId) {
        throw new HttpException(
          'No userId provided in loginTicket',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const user = await this._usersService.getUserById(payload.userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      if (!user.email) {
        throw new HttpException('User is anonymous', HttpStatus.UNAUTHORIZED);
      }
      const token = uuidv4() as KosRefreshToken;
      refreshToken = await this._refreshTokenRepository.createRefreshToken({
        user,
        token,
      });
      const accessTokenPayload: KosAccessTokenPayload = {
        userId: user.id,
        creator: user.creator,
        verified: !!user.email,
      };
      const accessToken = this._jwtService.sign(
        accessTokenPayload,
      ) as KosAccessToken;

      return {
        accessToken,
        refreshToken: refreshToken.token,
      };
    } else {
      if (passedRefreshToken) {
        // get refresh token record from DB by token
        refreshToken = await this._refreshTokenRepository.getRefreshToken(
          passedRefreshToken,
        );

        if (!refreshToken) {
          throw new HttpException(
            'Refresh token is not valid',
            HttpStatus.FORBIDDEN,
          );
        }

        user = refreshToken.user;

        // generate a new refresh token and update it in the DB
        const token = uuidv4() as KosRefreshToken;
        refreshToken = await this._refreshTokenRepository.updateRefreshToken(
          refreshToken,
          token,
        );
      } else {
        // respond with 401 for other apps
        throw new HttpException(
          'No refresh token provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    // generate access token
    const payload: KosAccessTokenPayload = {
      userId: user.id,
      creator: user.creator,
      verified: !!user.email,
    };
    const accessToken = this._jwtService.sign(payload) as KosAccessToken;

    return {
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  public async createAnonymousUser(
    passedAppId?: KosClientAppId,
  ): Promise<{accessToken: KosAccessToken; refreshToken: KosRefreshToken}> {
    if (
      !passedAppId ||
      !kosWhitelistedAppIdsToCreateUser.includes(passedAppId)
    ) {
      throw new HttpException('Bad appId', HttpStatus.FORBIDDEN);
    }
    const creationData: CreateUserDto = {
      anonymousName: uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: ' ',
        style: 'capital',
      }),
    };
    let newUser = await this._usersService.createUser(creationData);

    // generate access token
    const payload: KosAccessTokenPayload = {
      userId: newUser.id,
      creator: newUser.creator,
      verified: !!newUser.email,
    };
    const accessToken = this._jwtService.sign(payload) as KosAccessToken;

    // generate a new refresh token and save it in the DB
    const token = uuidv4() as KosRefreshToken;
    const refreshToken = await this._refreshTokenRepository.createRefreshToken({
      user: newUser,
      token,
    });
    return {
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  public async checkAuthState(
    email?: string,
    loginTicket?: KosLoginTicket,
  ): Promise<{
    email?: string;
    expiresAt?: IsoDateString;
    exists?: boolean;
    nickname?: string;
    avatar?: string;
  }> {
    if (!email) {
      return {};
    }
    const otp = await this._otpRepository.getOtpByEmail(email);
    if (!otp) {
      return {};
    }
    const userByEmail = await this._usersService.getUserByEmail(email);
    let userByLoginTicket: UserEntity | undefined;
    if (loginTicket) {
      try {
        const payload = this._jwtService.verify(loginTicket, {
          secret: httpConf.loginTicketSecret,
        }) as KosLoginTicketPayload;
        if (payload.userId) {
          userByLoginTicket = await this._usersService.getUserById(
            payload.userId,
          );
        }
        this._logger.verbose('User by login ticket res', {userByLoginTicket});
      } catch (error) {
        this._logger.error(error);
      }
    }

    // TODO: get expiresAt from otp
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    let nickname: string;
    let avatar: string | null = null;
    /**
     * primary is the user by email
     * if a such email does not exist but the user came from the another resource
     * to login by loginTicket his actual anonymousName should be displayed
     */
    if (userByEmail) {
      nickname = userByEmail.name || userByEmail.anonymousName;
      avatar = userByEmail.picture;
    } else if (userByLoginTicket) {
      nickname = userByLoginTicket.name || userByLoginTicket.anonymousName;
      avatar = userByLoginTicket.picture;
    } else {
      nickname = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        length: 2,
        separator: ' ',
        style: 'capital',
      });
    }
    return {
      email,
      expiresAt: expiresAt.toISOString() as IsoDateString,
      exists: !!userByEmail,
      nickname,
      avatar: avatar || 'https://assets.azarus.io/kos/unknown-user.png',
    };
  }

  public createIdentityForUser(
    user: UserEntity,
    platform: Platforms,
    data: object,
    twitchChannelId: string,
    twitchAccessToken: string | null,
    twitchRefreshToken: string | null,
  ): Promise<IdentityEntity> {
    return this._identitiesService.createIdentity({
      user,
      platform,
      data,
      twitchChannelId,
      twitchAccessToken,
      twitchRefreshToken,
    });
  }

  public async validateUserName(name: string): Promise<{
    validation: boolean;
    moderation: boolean;
    message?: string;
  }> {
    return this._moderationService.validateUserName(name);
  }

  public async checkTwitchIdentityForUserById(
    id: KosUserId,
    twitchId: number,
  ): Promise<boolean> {
    const user = await this._usersService.getUserById(id);
    if (!user) {
      throw new HttpException(
        'Server Error: User is not exist',
        HttpStatus.NOT_FOUND,
      );
    }
    const identities = await this._identitiesService.getIdentitiesByUser(user);
    // we use this way here because if we would try to get record from DB by twitch id we would have to using joins statement or something similar
    return !!identities.find((identity) => identity.data.id === twitchId);
  }

  public async twitchLogout(id: KosUserId, twitchId: number): Promise<any> {
    const user = await this._usersService.getUserById(id);
    if (!user) {
      throw new HttpException(
        'Server Error: User is not exist',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!twitchId) {
      throw new HttpException(
        'Server Error: Twitch ID is not provided',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this._identitiesService.deleteTwitchIdentity(user, twitchId);
  }

  public async logout(identityId: number): Promise<object> {
    try {
      await this._identitiesService.deleteIdentityById(identityId);
      return {
        message: 'Identity has been successfully deleted',
      };
    } catch (e) {
      throw new HttpException(
        'Server Error: Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

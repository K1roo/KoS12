import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Req,
  Res,
  Get,
  UseGuards,
  HttpStatus,
  Query,
  Redirect,
  HttpException,
  Delete,
  Param,
} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {Request, Response} from 'express';

import {KosAccessToken} from '../../../../agnostic/kos-lib/src/auth/kos-access-token';
import {kosAppIdsWithTokenInBody} from '../../../../agnostic/kos-lib/src/auth/kos-app-ids-with-tokens-in-body';
import {KosRefreshToken} from '../../../../agnostic/kos-lib/src/data/jwt/kos-refresh-token';
import {RefreshTokenBodyDto} from '../../../../agnostic/kos-lib/src/dto/refresh-token/refresh-token-body.dto';
import {KosClientAppId} from '../../../../agnostic/kos-lib/src/kos-client-app-id';
import httpServerConfig from '../../../kos-config/http-server/configuration';

import {AuthService} from './auth.service';
import {LoginWithEmailBodyDto} from './dto/login-with-email-body.dto';
import {VerifyOtpDto} from './dto/verify-otp.dto';
import {Platforms} from './enums/platforms.enum';
import {JwtGuard} from './guards/jwt.guard';
import {TwitchIdentityGuard} from './guards/twitchIdentity.guard';
import {PassportRequest} from './interfaces/passport-request.interface';
import {TwitchUser} from './interfaces/twitch-user.interface';

@Controller('auth')
export class AuthController {
  public constructor(private readonly _authService: AuthService) {}

  @Post('email')
  public async loginWithEmail(
    @Body(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true}))
    userData: LoginWithEmailBodyDto,
    @Req() req: Request,
    @Res() res: Response,
    // TODO: create interface
  ): Promise<any> {
    const refreshTokenFromCookie = req.cookies.refreshToken;
    const loginRes = await this._authService.loginWithEmail(
      userData,
      refreshTokenFromCookie,
    );
    const cookieOptions = {...httpServerConfig.cookieOptions['kos-companion']};
    cookieOptions.maxAge = 15 * 60 * 1000;
    res.cookie('email', userData.email, cookieOptions);
    if (userData.loginTicket) {
      res.cookie('loginTicket', userData.loginTicket, cookieOptions);
    }

    return res.send(loginRes);
  }

  @Post('verify-otp')
  public async verifyOtp(
    @Body(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true}))
    verifyOtpData: VerifyOtpDto,
    @Req() req: Request,
    @Res() res: Response,
    // TODO: create interface
  ): Promise<any> {
    const refreshTokenFromCookie = req.cookies.refreshToken;
    const email = req.cookies.email;
    const tokens = await this._authService.verifyOtp(
      verifyOtpData,
      email,
      refreshTokenFromCookie,
    );
    const cookieOptions = {...httpServerConfig.cookieOptions['kos-companion']};
    // TODO: discuss cookie age
    cookieOptions.maxAge = 365 * 24 * 60 * 60 * 1000;
    res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
    cookieOptions.maxAge = 0;
    res.clearCookie('email', cookieOptions);
    res.clearCookie('loginTicket', cookieOptions);
    return res.send({accessToken: tokens.accessToken});
  }

  @Get('state')
  public checkAuthState(@Req() req: Request): any {
    const {email, loginTicket} = req.cookies;
    return this._authService.checkAuthState(email, loginTicket);
  }

  @Get('validate')
  public async validateUserData(@Query('nickname') nickname?: string): Promise<{
    nickname: {
      validation: boolean;
      moderation: boolean;
      message?: string;
    };
  }> {
    if (nickname === undefined)
      return {
        nickname: {
          validation: false,
          moderation: false,
          message: 'Not valid nickname',
        },
      };
    const validationRes = await this._authService.validateUserName(nickname);
    return {
      nickname: validationRes,
    };
  }

  @Post('refresh-token')
  public async refreshToken(
    @Req() req: Request,
    @Res() res: Response,
    @Query('appId') passedAppId: KosClientAppId,
    @Body() refreshTokenBody: RefreshTokenBodyDto,
    // TODO: create interface
  ): Promise<any> {
    // get refresh token from cookie
    let passedRefreshToken = req.cookies.refreshToken;
    if (kosAppIdsWithTokenInBody.includes(passedAppId)) {
      /**
       * twitch extension keeps the refresh token in the locale storage
       * and passes it in the the body
       */
      passedRefreshToken = refreshTokenBody.refreshToken;
    }
    const tokens = await this._authService.refreshToken(
      passedRefreshToken,
      passedAppId,
      refreshTokenBody.loginTicket || refreshTokenBody.refreshTicket,
    );
    // a new refresh token is set as a cookie
    if (passedAppId === 'kos-companion') {
      const cookieOptions = {
        ...httpServerConfig.cookieOptions['kos-companion'],
      };
      // TODO: discuss cookie age
      cookieOptions.maxAge = 365 * 24 * 60 * 60 * 1000;
      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
    }
    const resBody: {
      accessToken: KosAccessToken;
      refreshToken?: KosRefreshToken;
    } = {
      accessToken: tokens.accessToken,
    };
    if (kosAppIdsWithTokenInBody.includes(passedAppId)) {
      resBody.refreshToken = tokens.refreshToken;
    }
    // a new access token is sent in the http response
    return res.send(resBody);
  }

  @Post('anonymous-user')
  public async createAnonymousUser(
    @Query('appId') passedAppId: KosClientAppId,
  ): Promise<any> {
    const {accessToken, refreshToken} =
      await this._authService.createAnonymousUser(passedAppId);
    return {
      accessToken,
      refreshToken,
    };
  }

  @Post('logout')
  public async logOut(
    @Res() res: Response,
    @Query('appId') appId: KosClientAppId = 'kos-companion',
  ): Promise<Response<void>> {
    // TODO: remove refreshToken from db
    if (appId === 'kos-companion') {
      const cookieOptions = {...httpServerConfig.cookieOptions[appId]};
      cookieOptions.maxAge = 0;
      res.clearCookie('refreshToken', cookieOptions);
      res.clearCookie('email', cookieOptions);
      res.clearCookie('loginTicket', cookieOptions);
    }
    return res.status(204).send();
  }

  // TODO: TEMP endpoint for development, to be deleted
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  public getMe(@Req() req: Request): any {
    return req.user;
  }

  @Get('twitch/login')
  @Redirect('callback')
  @UseGuards(JwtGuard)
  public async twitch(@Req() req: Request): Promise<any> {
    if (req.session) {
      req.session.user = req.user;
    }
    return HttpStatus.OK;
  }

  @Get('twitch/callback')
  @Redirect('/')
  @UseGuards(TwitchIdentityGuard)
  public async twitchCallback(@Req() req: any): Promise<any> {
    if (!req.user || !req.session.user) {
      throw new HttpException('Server Error: Missing important data', 401);
    }

    const isIdentityForUserAlreadyExist =
      await this._authService.checkTwitchIdentityForUserById(
        req.session.user.id,
        req.user.id,
      );
    if (!isIdentityForUserAlreadyExist) {
      const {twitchAccessToken, twitchRefreshToken} = req.user.extra;
      delete req.user.extra;

      const twitchChannelId = req.user.id as string; // TODO: check field name

      if (!twitchChannelId) {
        throw new HttpException('Server Error: Missing twitch id', 401);
      }

      return this._authService.createIdentityForUser(
        req.session.user,
        Platforms.TWITCH,
        req.user as object,
        twitchChannelId,
        twitchAccessToken || null,
        twitchRefreshToken || null,
      );
    }
  }

  @Delete('twitch/logout')
  @Redirect('/')
  @UseGuards(JwtGuard)
  public async twitchLogout(
    @Req() req: PassportRequest,
    @Body() user: TwitchUser,
  ): Promise<void> {
    await this._authService.twitchLogout(req.user.id, user.twitchId);
  }

  @Delete('identities/:id')
  @UseGuards(JwtGuard)
  public async deleteIdentity(
    @Param('id') id: number,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this._authService.logout(id);
    res.send(result);
  }
}

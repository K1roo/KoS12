import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {PassportModule} from '@nestjs/passport';
import {TypeOrmModule} from '@nestjs/typeorm';

import {IdentitiesModule} from '../../../business/identities/identities.module';
import {UsersModule} from '../../../business/users/users.module';
import {ModerationModule} from '../../../common/moderation/moderation.module';
import {SesModule} from '../../../common/ses/ses.module';
import httpServerConfig from '../../../kos-config/http-server/configuration';

import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
import {OtpRepository} from './otp.repository';
import {JwtStrategy} from './passport-strategies/jwt.strategy';
import {TwitchAuthStrategy} from './passport-strategies/twitch-identity.strategy';
import {RefreshTokenRepository} from './refresh-token.repository';

@Module({
  imports: [
    UsersModule,
    IdentitiesModule,
    PassportModule,
    TypeOrmModule.forFeature([OtpRepository, RefreshTokenRepository]),
    JwtModule.register({
      secret: httpServerConfig.jwtSecret,
      signOptions: {expiresIn: httpServerConfig.jwtExpiresIn},
    }),
    SesModule,
    ModerationModule,
  ],
  providers: [AuthService, JwtStrategy, TwitchAuthStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

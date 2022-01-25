import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import {EventEmitterModule} from '@nestjs/event-emitter';
import {ScheduleModule} from '@nestjs/schedule';
import {TypeOrmModule} from '@nestjs/typeorm';

import {DebugModule} from '../../business/debug/debug.module';
import {IdentitiesModule} from '../../business/identities/identities.module';
import {LeaderboardModule} from '../../business/leaderboard/leaderboard.module';
import {PaymentsModule} from '../../business/payments/payments.module';
import {QuestionsLibraryModule} from '../../business/questions-library/questions-library.module';
import {ShopModule} from '../../business/shop/shop.module';
import {UsersModule} from '../../business/users/users.module';
import {WavesModule} from '../../business/waves/waves.module';
import {WinstonLoggerMiddleware} from '../../common/logger/logger.middleware';
import {WinstonLogger} from '../../common/logger/logger.service';
import typeOrmConfig from '../../kos-config/typeorm/configuration';

import {AppController} from './app.controller';
import {AuthModule} from './auth/auth.module';
import {ExtGameEventsModule} from './ext-game-events/ext-game-events.module';
import {TwitchModule} from './twitch/twitch.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    WavesModule,
    QuestionsLibraryModule,
    ExtGameEventsModule,
    UsersModule,
    IdentitiesModule,
    AuthModule,
    ShopModule,
    PaymentsModule,
    DebugModule,
    LeaderboardModule,
    TwitchModule,
  ],
  providers: [WinstonLogger],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    /**
     * Change exclude value to use logger middleware
     * Moreover logging.interceptor can be used
     */
    consumer.apply(WinstonLoggerMiddleware).exclude('(.*)').forRoutes('*');
  }
}

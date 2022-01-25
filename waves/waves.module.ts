import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';

import {WinstonLogger} from '../../common/logger/logger.service';
import {RedisClientModule} from '../../common/redis/redis-client.module';
import {BoostsModule} from '../boosts/boosts.module';
import {ChannelSessionModule} from '../channel-session/channel-session.module';
import {LeaderboardModule} from '../leaderboard/leaderboard.module';
import {LobbyModule} from '../lobby/lobby.module';
import {LootsModule} from '../loots/loots.module';
import {TrophyTxModule} from '../trophy-tx/trophy-tx.module';
import {UsersModule} from '../users/users.module';
import {WavePlayerActionsModule} from '../wave-player-actions/wave-player-actions.module';
import {WsConnectionsModule} from '../ws-connections/ws-connections.module';
import {WsSubscriptionsModule} from '../ws-subscriptions/ws-subscriptions.module';

import {WaveQuestionRepository} from './wave-question.repository';
import {WaveRepository} from './wave.repository';
import {WavesController} from './waves.controller';
import {WavesService} from './waves.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaveRepository, WaveQuestionRepository]),
    RedisClientModule,
    WinstonLogger,
    WsSubscriptionsModule,
    WsConnectionsModule,
    WavePlayerActionsModule,
    LobbyModule,
    BoostsModule,
    ChannelSessionModule,
    UsersModule,
    TrophyTxModule,
    LootsModule,
    LeaderboardModule,
  ],
  controllers: [WavesController],
  providers: [WavesService, WinstonLogger],
  exports: [WavesService],
})
export class WavesModule {}

import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';

import {RedisClientModule} from '../../common/redis/redis-client.module';
import {ChannelSessionModule} from '../channel-session/channel-session.module';
import {LobbyModule} from '../lobby/lobby.module';
import {WavePlayerActionsModule} from '../wave-player-actions/wave-player-actions.module';
import {WsConnectionsModule} from '../ws-connections/ws-connections.module';
import {WsSubscriptionsModule} from '../ws-subscriptions/ws-subscriptions.module';

import {BombBoostService} from './boosts-services/bomb-boost.service';
import {FiftyFiftyBoostService} from './boosts-services/fifty-fifty-boost.service';
import {LightningBoostService} from './boosts-services/lightning-boost.service';
import {MegaStarBoostService} from './boosts-services/mega-star-boost.service';
import {ReverseScoreBoostService} from './boosts-services/reverse-score-boost.service';
import {SuperMegaStarBoostService} from './boosts-services/super-mega-star-boost.service';
import {SuperStarBoostService} from './boosts-services/super-star-boost.service';
import {BoostsController} from './boosts.controller';
import {BoostsService} from './boosts.service';
import {UserBoostRepository} from './user-boost.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserBoostRepository]),
    WsSubscriptionsModule,
    RedisClientModule,
    WavePlayerActionsModule,
    LobbyModule,
    ChannelSessionModule,
    WsConnectionsModule,
  ],
  controllers: [BoostsController],
  providers: [
    BoostsService,
    BombBoostService,
    ReverseScoreBoostService,
    LightningBoostService,
    SuperStarBoostService,
    MegaStarBoostService,
    SuperMegaStarBoostService,
    FiftyFiftyBoostService,
  ],
  exports: [BoostsService],
})
export class BoostsModule {}

import {Module} from '@nestjs/common';

import {IdentitiesModule} from '../identities/identities.module';
import {LobbyModule} from '../lobby/lobby.module';

import {LeaderboardController} from './leaderboard.controller';
import {LeaderboardService} from './leaderboard.service';

@Module({
  imports: [LobbyModule, IdentitiesModule],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}

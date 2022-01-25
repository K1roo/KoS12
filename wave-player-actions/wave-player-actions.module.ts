import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';

import {WavePlayerActionRepository} from './wave-player-action.repository';
import {WavePlayerActionsService} from './wave-player-actions.service';

@Module({
  imports: [TypeOrmModule.forFeature([WavePlayerActionRepository])],
  controllers: [],
  providers: [WavePlayerActionsService],
  exports: [WavePlayerActionsService],
})
export class WavePlayerActionsModule {}

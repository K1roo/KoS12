import {Module} from '@nestjs/common';

import {RedisClientModule} from '../../common/redis/redis-client.module';
import {WsSubscriptionsModule} from '../ws-subscriptions/ws-subscriptions.module';

import {DemoCursorController} from './demo-cursor.controller';
import {DemoCursorService} from './demo-cursor.service';

@Module({
  imports: [RedisClientModule, WsSubscriptionsModule],
  controllers: [DemoCursorController],
  providers: [DemoCursorService],
  exports: [DemoCursorService],
})
export class DemoCursorModule {}

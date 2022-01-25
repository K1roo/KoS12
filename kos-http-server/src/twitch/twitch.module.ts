import {HttpModule, Module} from '@nestjs/common';

import {RedisClientModule} from '../../../common/redis/redis-client.module';

import {TwitchController} from './twitch.controller';
import {TwitchService} from './twitch.service';

@Module({
  imports: [HttpModule, RedisClientModule],
  controllers: [TwitchController],
  providers: [TwitchService],
})
export class TwitchModule {}

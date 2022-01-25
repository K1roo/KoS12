import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';

import {WsConnectionsModule} from '../ws-connections/ws-connections.module';

import {ChannelSessionRepository} from './channel-session.repository';
import {ChannelSessionService} from './channel-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChannelSessionRepository]),
    WsConnectionsModule,
  ],
  providers: [ChannelSessionService],
  exports: [ChannelSessionService],
})
export class ChannelSessionModule {}

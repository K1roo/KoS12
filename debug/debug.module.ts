import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';

import {RedisClientModule} from '../../common/redis/redis-client.module';
import httpServerConfig from '../../kos-config/http-server/configuration';
import {KosEnablerModule} from '../../kos-enabler/kos-enabler.module';
import {BoostsModule} from '../boosts/boosts.module';
import {DemoCursorModule} from '../demo-cursor/demo-cursor.module';
import {QuestionsLibraryModule} from '../questions-library/questions-library.module';
import {UsersModule} from '../users/users.module';
import {WavesModule} from '../waves/waves.module';
import {WsConnectionsModule} from '../ws-connections/ws-connections.module';
import {WsTasksModule} from '../ws-tasks/ws-tasks.module';

import {DebugController} from './debug.controller';
import {DebugService} from './debug.service';

@Module({
  imports: [
    WsConnectionsModule,
    WsTasksModule,
    DemoCursorModule,
    UsersModule,
    BoostsModule,
    JwtModule.register({
      secret: httpServerConfig.jwtSecret,
      signOptions: {expiresIn: '2d'},
    }),
    UsersModule,
    QuestionsLibraryModule,
    RedisClientModule,
    WavesModule,
    KosEnablerModule,
  ],
  controllers: [DebugController],
  providers: [DebugService],
  exports: [DebugService],
})
export class DebugModule {}

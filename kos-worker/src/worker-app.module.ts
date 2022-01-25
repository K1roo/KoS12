import {BullModule} from '@nestjs/bull';
import {Module} from '@nestjs/common';
import {EventEmitterModule} from '@nestjs/event-emitter';
import {TypeOrmModule} from '@nestjs/typeorm';
import * as Redis from 'ioredis';

import {KosEnablerJobsModule} from '../../common/jobs/kos-enabler-jobs/kos-enabler-jobs.module';
import {KosUserJobsModule} from '../../common/jobs/kos-user-jobs/kos-user-jobs.module';
import {Environments} from '../../common/types/environments';
import redisConfig from '../../kos-config/redis/configuration';
import typeOrmConfig from '../../kos-config/typeorm/configuration';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      createClient: (_type, _opts) => {
        if (
          [Environments.STAGING, Environments.PRODUCTION].includes(
            process.env.NODE_ENV as Environments,
          )
        ) {
          return new Redis.Cluster(
            redisConfig.clusterMode.servers,
            redisConfig.clusterMode.options,
          );
        } else {
          return new Redis(redisConfig.singleMode);
        }
      },
      prefix: '{kos-cluster-prefix}',
    }),
    KosEnablerJobsModule,
    KosUserJobsModule,
  ],
  providers: [],
})
export class WorkerAppModule {}

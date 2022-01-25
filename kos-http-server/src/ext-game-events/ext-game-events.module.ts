import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';

import {WinstonLogger} from '../../../common/logger/logger.service';

import {ExtGameEventsController} from './ext-game-events.controller';
import {ExtGameEventsService} from './ext-game-events.service';
import {GameEventRepository} from './game-event.repository';

@Module({
  imports: [TypeOrmModule.forFeature([GameEventRepository]), WinstonLogger],
  providers: [ExtGameEventsService, WinstonLogger],
  controllers: [ExtGameEventsController],
})
export class ExtGameEventsModule {}

/* eslint-disable @typescript-eslint/naming-convention */
import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import * as AWS from 'aws-sdk';
import {FindConditions} from 'typeorm';
import {v4 as uuidv4} from 'uuid';

import {WinstonLogger} from '../../../common/logger/logger.service';
import sqsConfig from '../../../kos-config/aws-sqs/configuration';

import {PostExtGameEventFilterDto} from './dto/create-game-event-filter.dto';
import {GameEvent} from './game-event.entity';
import {GameEventRepository} from './game-event.repository';

const sqs = new AWS.SQS(sqsConfig.notaryServiceConsumer.initParams);

@Injectable()
export class ExtGameEventsService {
  private readonly _logger: WinstonLogger = new WinstonLogger(
    'ExtGameEventsService',
  );
  public constructor(
    @InjectRepository(GameEventRepository)
    private _gameEventsRepository: GameEventRepository,
  ) {}

  public async getExtGameEvents(
    type?: string,
    skip?: number,
    limit?: number,
  ): Promise<GameEvent[]> {
    let query: FindConditions<GameEvent> | FindConditions<GameEvent[]> = {};
    if (typeof type === 'string') query.type = type;
    return this._gameEventsRepository.getExtGameEvents(type, skip, limit);
  }

  public async createExtGameEvent(
    gameEventData: PostExtGameEventFilterDto,
  ): Promise<void> {
    // send SQS to notary service
    const params = {
      MessageBody: JSON.stringify(gameEventData),
      QueueUrl: sqsConfig.notaryServiceConsumer.queueUrl,
      MessageDeduplicationId: uuidv4(),
      MessageGroupId: sqsConfig.notaryServiceConsumer.messageGroupId,
    };
    const res = await sqs.sendMessage(params).promise();
    this._logger.log('Sent SQS to Notary service', {res});

    // TEMP: store in our DB (TODO: remove after debugging)
    await this._gameEventsRepository.createExtGameEvent(gameEventData);
  }
}

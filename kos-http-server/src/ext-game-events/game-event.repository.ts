import {EntityRepository, FindConditions, Repository} from 'typeorm';

import {WinstonLogger} from '../../../common/logger/logger.service';

import {PostExtGameEventFilterDto} from './dto/create-game-event-filter.dto';
import {GameEvent} from './game-event.entity';

@EntityRepository(GameEvent)
export class GameEventRepository extends Repository<GameEvent> {
  private _logger: WinstonLogger;
  public constructor() {
    super();
    this._logger = new WinstonLogger('ExtGameEventsRepository');
  }

  public async getExtGameEvents(
    type?: string,
    skip?: number,
    limit?: number,
  ): Promise<GameEvent[]> {
    let query: FindConditions<GameEvent> | FindConditions<GameEvent[]> = {};
    if (typeof type === 'string') query.type = type;
    const gameEvents = await this.find({
      where: query,
      skip: typeof skip === 'number' ? skip : 0,
      take: typeof limit === 'number' ? limit : 100,
    });
    this._logger.verbose('Got game events', {
      type,
      skip,
      limit,
      gameEvents,
    });
    return gameEvents;
  }

  public async createExtGameEvent(
    gameEventData: PostExtGameEventFilterDto,
  ): Promise<GameEvent> {
    const {type, data} = gameEventData;
    const gameEvent = new GameEvent();
    gameEvent.type = type;
    gameEvent.data = data;
    const savedGameEvent = await gameEvent.save();
    // break array of events into single game event entities

    this._logger.verbose('New game events created', {
      gameEventData,
    });
    return savedGameEvent;
  }
}

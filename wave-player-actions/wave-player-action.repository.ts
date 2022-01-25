import {
  DeepPartial,
  EntityRepository,
  FindConditions,
  Repository,
} from 'typeorm';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WaveLobbyId} from '../../../agnostic/kos-lib/src/wave-state/wave-lobby-id';
import {WinstonLogger} from '../../common/logger/logger.service';
import {WavePlayerAction} from '../../common/types/db-entities/wave-player-action/wave-player-action';

import {WavePlayerActionEntity} from './wave-player-action.entity';

@EntityRepository(WavePlayerActionEntity)
export class WavePlayerActionRepository extends Repository<WavePlayerActionEntity> {
  private _logger: WinstonLogger;
  public constructor() {
    super();
    this._logger = new WinstonLogger(WavePlayerActionRepository.name);
  }

  public async createPlayerAction(
    data: Partial<WavePlayerAction>,
  ): Promise<WavePlayerActionEntity> {
    const playerAction = this.create(data as unknown as DeepPartial<this>);
    await playerAction.save();
    this._logger.debug('Player action created', {playerAction});
    return playerAction;
  }

  public async getQuestionAnswers(
    userId: KosUserId,
    params: {channelId?: string; lobbyId?: WaveLobbyId} = {},
  ): Promise<WavePlayerActionEntity[]> {
    let query:
      | FindConditions<WavePlayerActionEntity>
      | FindConditions<WavePlayerActionEntity[]> = {
      userId,
      actionType: 'answer',
    };

    if (params.channelId) query.channelId = params.channelId;
    if (params.lobbyId) query.lobbyId = params.lobbyId;
    return this.find({where: query});
  }
}

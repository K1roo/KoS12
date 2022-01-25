import {Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {InjectRepository} from '@nestjs/typeorm';
import {
  DeleteResult,
  FindConditions,
  LessThan,
  ObjectLiteral,
  UpdateResult,
} from 'typeorm';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WaveLobbyId} from '../../../agnostic/kos-lib/src/wave-state/wave-lobby-id';
import {WinstonLogger} from '../../common/logger/logger.service';
import {AnswerActionData} from '../../common/types/db-entities/wave-player-action/answer-action-data';
import {WavePlayerAction} from '../../common/types/db-entities/wave-player-action/wave-player-action';
import {
  INCREMENT_STARS_WON,
  KOS_CHANNEL,
  WAVE_PARTICIPANT,
} from '../../common/types/event-emitter-keys';

import {WavePlayerActionEntity} from './wave-player-action.entity';
import {WavePlayerActionRepository} from './wave-player-action.repository';

@Injectable()
export class WavePlayerActionsService {
  private _logger = new WinstonLogger(WavePlayerActionsService.name);

  public constructor(
    @InjectRepository(WavePlayerActionRepository)
    private _wavePlayerActionRepository: WavePlayerActionRepository,
    private _eventEmitter: EventEmitter2,
  ) {}

  public async createPlayerAction(
    data: Partial<WavePlayerAction>,
  ): Promise<WavePlayerActionEntity> {
    const playerAction =
      await this._wavePlayerActionRepository.createPlayerAction(data);
    this._eventEmitter.emit(
      `${KOS_CHANNEL}.${WAVE_PARTICIPANT}.${INCREMENT_STARS_WON}`,
      0,
      playerAction.starsDistributed,
      playerAction.userId,
      playerAction.lobbyId,
    );
    return playerAction;
  }

  public async getQuestionAnswers(
    userId: KosUserId,
    params: {channelId?: string; lobbyId?: WaveLobbyId} = {},
  ): Promise<WavePlayerActionEntity[]> {
    return this._wavePlayerActionRepository.getQuestionAnswers(userId, params);
  }

  public async deleteQuestionAnswers(
    channelId: string,
    till?: Date,
  ): Promise<DeleteResult> {
    let criteria: FindConditions<WavePlayerActionEntity> = {channelId};
    if (till) {
      criteria.emittedAt = LessThan(till);
    }
    return this._wavePlayerActionRepository.delete(criteria);
  }

  public async getPlayerAnswer(
    lobbyId: WaveLobbyId,
    userId: KosUserId,
    waveQuestionId: number,
  ): Promise<
    | (WavePlayerAction<AnswerActionData> & {starsDistributed: number})
    | undefined
  > {
    return this._wavePlayerActionRepository.findOne({
      where: {
        actionType: 'answer',
        lobbyId,
        userId,
        waveQuestionId,
      },
    }) as Promise<
      | (WavePlayerAction<AnswerActionData> & {starsDistributed: number})
      | undefined
    >;
  }

  public async updateUserStarsDistributed(
    actionId: number,
    newValue: number,
    params?: {
      emitEvent: boolean;
      oldValue: number;
      lobbyId: WaveLobbyId;
      userId: KosUserId;
    },
  ): Promise<UpdateResult> {
    const res = await this._wavePlayerActionRepository.update(
      {id: actionId},
      {starsDistributed: newValue},
    );
    this._logger.debug('Stars distributed value has been updated', {
      actionId,
      newValue,
      res,
    });
    if (params && params.emitEvent) {
      this._eventEmitter.emit(
        `${KOS_CHANNEL}.${WAVE_PARTICIPANT}.${INCREMENT_STARS_WON}`,
        params.oldValue,
        newValue,
        params.userId,
        params.lobbyId,
      );
    }
    return res;
  }

  public getAdvancedLobbyLeaderboard(waveLobbyId: WaveLobbyId): Promise<
    {
      userId: KosUserId;
      level: number;
      trophies: number;
      position: string;
      score: number;
    }[]
  > {
    const whereClause: ObjectLiteral = {
      actionType: 'answer',
      lobbyId: waveLobbyId,
    };

    return this._wavePlayerActionRepository
      .createQueryBuilder('action')
      .select('SUM(stars_distributed)', 'score')
      .addSelect(
        'ROW_NUMBER () OVER (ORDER BY SUM(stars_distributed) DESC)',
        'position',
      )
      .addSelect('user.id', 'userId')
      .addSelect('user.level', 'level')
      .addSelect('user.trophies', 'trophies')
      .leftJoin('action.user', 'user')
      .where(whereClause)
      .groupBy('user.id')
      .getRawMany();
  }
}

import {Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';

import {KosBoostId} from '../../../../agnostic/kos-lib/src/dto/boost/kos-boost-id';
import {KosUserId} from '../../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WaveLobbyId} from '../../../../agnostic/kos-lib/src/wave-state/wave-lobby-id';
import {WaveProgressItem} from '../../../../agnostic/kos-lib/src/wave-state/wave-progress-item';
import {WinstonLogger} from '../../../common/logger/logger.service';
import {RedisClientService} from '../../../common/redis/redis-client.service';
import {KOS_USER_LOBBY_PROGRESS} from '../../../common/redis/redis-storage-keys';
import {RedisRepository} from '../../../common/redis/redis.repository';
import {QuestionPartialState} from '../../../common/types/db-entities/question/question-partial-state';
import {
  KOS_CHANNEL,
  SEND_APPLIED_BOOST_RESULT,
  WAVE_PARTICIPANT,
} from '../../../common/types/event-emitter-keys';
import {KosUserBoostService} from '../../../common/types/kos-boosts/boost';
import {Boost} from '../../../kos-ws-server/src/decorators/boost-class.decorator';
import {WsServerError} from '../../../kos-ws-server/src/ws/ws-server-error.class';
import {LobbyService} from '../../lobby/lobby.service';
import {WavePlayerActionsService} from '../../wave-player-actions/wave-player-actions.service';
import {BoostsService} from '../boosts.service';

const boostId = 'MegaStar' as KosBoostId;

@Boost(boostId)
@Injectable()
export class MegaStarBoostService extends KosUserBoostService {
  private readonly _logger = new WinstonLogger(MegaStarBoostService.name);

  public lootWeight = 1;
  public rarity = 2;

  public readonly id = boostId;
  public readonly title = 'MegaStar';
  public readonly description = 'Multiply your Final Challenge Score by 100%';
  public readonly iconUrl =
    'https://assets.azarus.io/kos/boosts-icons/mega-star-29042021.svg';
  public readonly iconDefaultRatio = 1;
  public readonly allowedBeforeAnswer = true;
  public readonly allowedAfterAnswer = true;
  public readonly mutateCalculatedStars = true;

  public constructor(
    private readonly _redisRepository: RedisRepository,
    private readonly _lobbyService: LobbyService,
    private readonly _boostsService: BoostsService,
    private readonly _wavePlayerActionsService: WavePlayerActionsService,
    private readonly _redisClientService: RedisClientService,
    private _eventEmitter: EventEmitter2,
  ) {
    super();
    this._boostsService.registerBoost(this);
  }

  public getBoostedScoreValue(oldVal: number): number {
    return Math.ceil(oldVal * 2);
  }

  public async apply(
    mesId: number,
    userId: KosUserId,
    lobbyId: WaveLobbyId,
    questionIndex: number,
    appliedAt: Date,
  ): Promise<void> {
    const now = Date.now();
    const {redisClient} = this._redisClientService;
    this._logger.debug('Applying MegaStar');
    const boostsApplied = await this._redisRepository.addBoostApplied(
      userId,
      lobbyId,
      this.id,
      questionIndex,
      appliedAt,
    );
    if (boostsApplied > 3) {
      await this._redisRepository.removeLastAppliedBoost(userId, lobbyId);
      throw new WsServerError(
        mesId,
        'Boosts usage limitation per wave exceeded',
      );
    }
    const lobby = await this._lobbyService.getWaveAndQuestionsByLobbyId(
      lobbyId,
    );
    if (!lobby) {
      await this._redisRepository.removeLastAppliedBoost(userId, lobbyId);
      throw new WsServerError(mesId, `Lobby ${lobbyId} does not exist`);
    }
    const [partialQuestionState, userBoost] = await Promise.all([
      this._redisRepository.getQuestionPartialState(
        userId,
        lobbyId,
        questionIndex,
      ),
      // TODO: handle race condition, use transactions
      this._boostsService.getUserBoost(userId, boostId),
    ]);
    const waveQuestion = lobby.wave.questions[questionIndex];
    this._logger.debug('Additional data', {
      boostsApplied,
      lobby,
      partialQuestionState,
      userBoost,
      waveQuestion,
    });
    if (!waveQuestion) {
      await this._redisRepository.removeLastAppliedBoost(userId, lobbyId);
      throw new WsServerError(
        mesId,
        `Question ${questionIndex} does not exist in lobby ${lobbyId}`,
      );
    }
    if (partialQuestionState && partialQuestionState.appliedBoost) {
      await this._redisRepository.removeLastAppliedBoost(userId, lobbyId);
      throw new WsServerError(
        mesId,
        `One boost has been already applied in the question ${questionIndex}`,
      );
    }
    let appliedAtMs = appliedAt.getTime();
    if (
      waveQuestion.startAt.getTime() > appliedAtMs ||
      waveQuestion.finishAt.getTime() < appliedAtMs
    ) {
      this._logger.warn('The boost usage time ranges issue', {
        now: new Date(now).toISOString(),
        appliedAt,
        waveQuestion,
      });
      throw new WsServerError(
        mesId,
        `appliedAt does not correlate with question time`,
      );
    }
    if (!userBoost || userBoost.amount === 0) {
      await this._redisRepository.removeLastAppliedBoost(userId, lobbyId);
      throw new WsServerError(mesId, `User does not have boost ${boostId}`);
    }
    if (now < appliedAtMs) {
      this._logger.warn('The time synchronization issue', {
        now: new Date(now).toISOString(),
      });
      appliedAtMs = now;
    }
    if (now - appliedAtMs >= 3000) {
      this._logger.warn('The time allowed range issue', {
        now: new Date(now).toISOString(),
      });
      await this._redisRepository.removeLastAppliedBoost(userId, lobbyId);
      throw new WsServerError(
        mesId,
        `Wrong appliedAt. Server time: ${new Date(now).toISOString()}`,
      );
    }
    let availableOptions = waveQuestion.question.options.map((_val, i) => [i]);
    let correctAnswerIndexes = waveQuestion.correctAnswerIndexes;
    let {minScore, maxScore} = waveQuestion;
    const partialQuestionStateToSave: QuestionPartialState = {
      buttonMapper: availableOptions,
      correctAnswerIndexes,
      minScore,
      maxScore,
      appliedBoost: {boostId, questionIndex, appliedAt},
    };

    const userAnswer = await this._wavePlayerActionsService.getPlayerAnswer(
      lobbyId,
      userId,
      waveQuestion.id,
    );
    const promises: Promise<unknown>[] = [];
    if (userAnswer && userAnswer.won) {
      this._logger.debug('User already won, updating result', {
        userAnswer,
      });
      const newValue = this.getBoostedScoreValue(userAnswer.starsDistributed);
      promises.push(
        this._wavePlayerActionsService.updateUserStarsDistributed(
          userAnswer.id,
          newValue,
          {
            emitEvent: true,
            lobbyId,
            userId,
            oldValue: userAnswer.starsDistributed,
          },
        ),
      );
      promises.push(
        redisClient.lset(
          `${KOS_USER_LOBBY_PROGRESS}:${userId}:${lobbyId}`,
          questionIndex,
          JSON.stringify({ps: WaveProgressItem.PASSED, sa: newValue}),
        ),
      );
    }
    // TODO: consider using txs
    promises.push(
      this._redisRepository.setQuestionPartialState(
        userId,
        lobbyId,
        questionIndex,
        partialQuestionStateToSave,
      ),
    );
    // TODO: return boost state from this method and broadcast already prepared data
    promises.push(this._boostsService.decrUserBoostAmount(userId, boostId, 1));
    promises.push(
      this._wavePlayerActionsService.createPlayerAction({
        waveId: lobby.wave.id,
        lobbyId,
        userId,
        channelId: lobby.wave.channelId,
        actionType: 'boost',
        emittedAt: appliedAt,
        data: {},
        waveQuestionId: waveQuestion.id,
      }),
    );
    await Promise.all(promises);
    this._eventEmitter.emit(
      `${KOS_CHANNEL}.${WAVE_PARTICIPANT}.${SEND_APPLIED_BOOST_RESULT}`,
      userId,
      lobby.wave,
      this.id,
      questionIndex,
      lobbyId,
    );
  }
}

import {Injectable} from '@nestjs/common';
import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {InjectRepository} from '@nestjs/typeorm';
import {
  FindConditions,
  FindManyOptions,
  In,
  LessThan,
  UpdateResult,
} from 'typeorm';
import {v4 as uuidv4} from 'uuid';

import {ExternalPictureDto} from '../../../agnostic/common-lib/src/dynamic-picture/external-picture.dto';
import {DynamicTextVariableKey} from '../../../agnostic/common-lib/src/dynamic-text/dynamic-text-variable-key';
import {OneOfDynamicTextDto} from '../../../agnostic/common-lib/src/dynamic-text/one-of-dynamic-text.dto';
import {RawDynamicTextDto} from '../../../agnostic/common-lib/src/dynamic-text/raw-dynamic-text.dto';
import {QuestionDto} from '../../../agnostic/common-lib/src/question/question.dto';
import {asClass} from '../../../agnostic/common-lib/src/transformer/class/as-class';
import {TwitchChannelId} from '../../../agnostic/common-lib/src/twitch/twitch-channel-id';
import {mapToIntegerInLimits} from '../../../agnostic/common-lib/src/utils/map-to-integer-in-limits';
import {KosLootId} from '../../../agnostic/kos-lib/src/dto/loot/kos-loot-id';
import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {asKosWavesCurrentWaveNextDto} from '../../../agnostic/kos-lib/src/endpoint/waves/current-wave/as-kos-waves-current-wave-next.dto';
import {KosWavesCurrentWaveNextDto} from '../../../agnostic/kos-lib/src/endpoint/waves/current-wave/kos-waves-current-wave-next.dto';
import {KosWavesCurrentWaveParamsDto} from '../../../agnostic/kos-lib/src/endpoint/waves/current-wave/kos-waves-current-wave-params.dto';
import {KosWavesSelectAnswerIndexesParamsDto} from '../../../agnostic/kos-lib/src/endpoint/waves/select-answer-indexes/kos-waves-select-answer-indexes-params.dto';
import {KosClientAppId} from '../../../agnostic/kos-lib/src/kos-client-app-id';
import {WaveQuestionDto} from '../../../agnostic/kos-lib/src/wave-question/wave-question-dto';
import {ActiveWaveLobbyDto} from '../../../agnostic/kos-lib/src/wave-state/active-wave-lobby.dto';
import {AppliedBoostDto} from '../../../agnostic/kos-lib/src/wave-state/applied-boost.dto';
import {BeforeWaveDto} from '../../../agnostic/kos-lib/src/wave-state/before-wave.dto';
import {KosCurrentKingDto} from '../../../agnostic/kos-lib/src/wave-state/kos-current-king.dto';
import {ResultWaveLobbyDto} from '../../../agnostic/kos-lib/src/wave-state/result-wave-lobby.dto';
import {WaveLobbyId} from '../../../agnostic/kos-lib/src/wave-state/wave-lobby-id';
import {WaveProgressItem} from '../../../agnostic/kos-lib/src/wave-state/wave-progress-item';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {RemoteNamespaceType} from '../../../agnostic/reactive-data/remote-namespace-type';
import {ServerFrameType} from '../../../agnostic/reactive-data/server-frame-type';
import {SupportedGames} from '../../../agnostic/supported-games';
import {WinstonLogger} from '../../common/logger/logger.service';
import {RedisClientService} from '../../common/redis/redis-client.service';
import {KOS_USER_LOBBY_PROGRESS} from '../../common/redis/redis-storage-keys';
import {RedisRepository} from '../../common/redis/redis.repository';
import {WaveSettings} from '../../common/types/configs/wave-settings';
import {QuestionPartialState} from '../../common/types/db-entities/question/question-partial-state';
import {WaveQuestion} from '../../common/types/db-entities/wave-question/wave-question';
import {Wave} from '../../common/types/db-entities/wave/wave';
import {WaveStatus} from '../../common/types/db-entities/wave/wave-status';
import {
  EMIT_CHANGES,
  EMIT_LOOTS_AMOUNT_UPDATE,
  KOS_CHANNEL,
  KOS_USER,
  SEND_SELECTED_ANSWER,
  USER_STATE,
  WAVE_PARTICIPANT,
} from '../../common/types/event-emitter-keys';
import {AppliedBoost} from '../../common/types/kos-boosts/applied-boost';
import {WaveTriggerEvents} from '../../common/types/services-communication/bull/kos-enabler-jobs-arguments/wave-trigger-event';
import {SystemEvents} from '../../common/types/ws/system-events';
import redisConfig from '../../kos-config/redis/configuration';
import waveResultConf from '../../kos-config/waves-result-settings/configuration';
import waveConf from '../../kos-config/waves-settings/configuration';
import devWaveConf from '../../kos-config/waves-settings/development';
import {WsServerError} from '../../kos-ws-server/src/ws/ws-server-error.class';
import {getRandomInt} from '../../utils/rand-int.util';
import {BoostsService} from '../boosts/boosts.service';
import {ChannelSessionService} from '../channel-session/channel-session.service';
import {LeaderboardService} from '../leaderboard/leaderboard.service';
import {LobbyParticipantEntity} from '../lobby/lobby-participant.entity';
import {LobbyService} from '../lobby/lobby.service';
import {LootsService} from '../loots/loots.service';
import {TrophyTxService} from '../trophy-tx/trophy-tx.service';
import {UsersService} from '../users/users.service';
import {WavePlayerActionsService} from '../wave-player-actions/wave-player-actions.service';
import {WsConnectionService} from '../ws-connections/ws-connections.service';
import {WsSubscriptionsService} from '../ws-subscriptions/ws-subscriptions.service';

import {WaveQuestionEntity} from './wave-question.entity';
import {WaveQuestionRepository} from './wave-question.repository';
import {WaveEntity} from './wave.entity';
import {WaveRepository} from './wave.repository';

const {delayToShowEndScreenMs, delayToShowWaveResultsMs, waveDurationMs} =
  waveConf;

const clientOptions: ClientOptions = {
  transport: Transport.REDIS,
  options: redisConfig,
};

@Injectable()
export class WavesService {
  private readonly _client: ClientProxy;
  public readonly _logger = new WinstonLogger(WavesService.name);
  public constructor(
    @InjectRepository(WaveRepository)
    private _waveRepository: WaveRepository,
    @InjectRepository(WaveQuestionRepository)
    private _waveQuestionRepository: WaveQuestionRepository,
    private readonly _wsSubscriptionsService: WsSubscriptionsService,
    private _eventEmitter: EventEmitter2,
    private readonly _redisClientService: RedisClientService,
    private readonly _wsConnectionService: WsConnectionService,
    private readonly _lobbyService: LobbyService,
    private readonly _redisRepository: RedisRepository,
    private readonly _boostsService: BoostsService,
    private readonly _wavePlayerActionsService: WavePlayerActionsService,
    private readonly _channelSessionService: ChannelSessionService,
    private readonly _usersService: UsersService,
    private readonly _trophyTxService: TrophyTxService,
    private readonly _lootsService: LootsService,
    private readonly _leaderboardService: LeaderboardService,
  ) {
    this._client = ClientProxyFactory.create(clientOptions);
  }

  public async getWaves(
    channelId?: string,
    skip?: number,
    limit?: number,
  ): Promise<WaveEntity[]> {
    let query: FindConditions<WaveEntity> | FindConditions<WaveEntity[]> = {};
    if (typeof channelId === 'string') query.channelId = channelId;
    return this._waveRepository.getWaves(channelId, skip, limit);
  }

  public async createWave(
    data: {
      channelId: string;
      questionsAmount: number;
      game: SupportedGames;
      previousFinishedAt: Date;
      reason: WaveTriggerEvents;
      startAt: Date;
    } & Partial<Wave>,
  ): Promise<WaveEntity> {
    const lastWave = await this.getActualChannelWave(data.channelId);
    if (
      lastWave &&
      lastWave.status !== 'finished' &&
      Date.now() - lastWave.startAt.getTime() <= waveDurationMs
    ) {
      this._logger.warn('There is already one wave in progress', {
        data,
        lastWave,
      });
      throw new Error('There is already one wave in progress');
    }
    const zeroLobbyId = uuidv4() as WaveLobbyId;
    data.zeroLobbyId = zeroLobbyId;
    const newWave = await this._waveRepository.createWave(data);

    await this._lobbyService.createLobby(
      newWave.id,
      newWave.channelId,
      [],
      newWave.questionsAmount,
      true,
      zeroLobbyId,
    );
    // TODO: research events from DB
    return newWave;
  }

  public async getPlayerProgress(
    lobbyId: WaveLobbyId,
    userId: KosUserId,
    questionIndexToHideProgress?: number,
  ): Promise<{
    history: WaveProgressItem[];
    score: number;
  }> {
    const {redisClient} = this._redisClientService;
    const progress = (
      await redisClient.lrange(
        `${KOS_USER_LOBBY_PROGRESS}:${userId}:${lobbyId}`,
        0,
        -1,
      )
    ).map((item) => JSON.parse(item));
    return {
      history: progress.map((item, i) => {
        if (
          typeof questionIndexToHideProgress === 'number' &&
          i === questionIndexToHideProgress
        ) {
          return WaveProgressItem.EMPTY;
        }
        return item.ps;
      }),
      score: progress
        .map((item, i) => {
          if (
            typeof questionIndexToHideProgress === 'number' &&
            i === questionIndexToHideProgress
          ) {
            return 0;
          }
          return item.sa;
        })
        .reduce((a, b) => a + b, 0),
    };
  }

  public async getWaveScreenForPlayer(
    channelId: string,
    userId: KosUserId,
    lobbyId: WaveLobbyId | null,
    wave: Wave | null,
    questionIndex: number | null,
    fetchAnswer: boolean,
    stateToBuildFor?: WaveStatus,
    trophiesRewarded?: number,
    lootRewardedAmount?: number,
  ): Promise<KosWavesCurrentWaveNextDto> {
    this._logger.debug('Getting wave screen', {
      userId,
      lobbyId,
      wave,
      questionIndex,
      fetchAnswer,
      stateToBuildFor,
    });
    // TODO: store user wave screen in some storage an return it by one request
    let currentKingDto: KosCurrentKingDto | null = null;
    if (
      !wave ||
      (wave.startAt && Date.now() - wave.startAt.getTime() >= 60 * 60 * 1000) ||
      ['awaiting', 'matchmaking_in_progress', 'finished'].includes(wave.status)
    ) {
      const [currentKing] = await this._lobbyService.getLeaderboard(
        channelId,
        0,
        1,
      );
      currentKingDto = currentKing
        ? new KosCurrentKingDto(
            currentKing.name || currentKing.anonymousName,
            new ExternalPictureDto(
              currentKing.picture ? 280 / 264 : 1,
              currentKing.picture ||
                'https://assets.azarus.io/kos/unknown-user.png',
            ),
            +currentKing.score,
            currentKing.userId,
          )
        : null;
    }
    let screenToReturn: KosWavesCurrentWaveNextDto = new BeforeWaveDto(
      new Date(),
      null,
      currentKingDto,
      null,
    );
    if (
      !wave ||
      (wave.startAt && Date.now() - wave.startAt.getTime() >= 60 * 60 * 1000)
    ) {
      return screenToReturn;
    }
    const status = stateToBuildFor || wave.status;
    let partialQuestionSate: QuestionPartialState | null = null;
    let appliedBoosts: AppliedBoost[] | null = null;
    switch (status) {
      case 'awaiting':
      case 'matchmaking_in_progress':
        screenToReturn = new BeforeWaveDto(
          new Date(wave.previousFinishedAt.getTime() + delayToShowEndScreenMs),
          wave.startAt,
          currentKingDto,
          wave.id,
        );
        return screenToReturn;
        break;
      case 'question_generated':
      case 'question_revealed':
      case 'question_results':
      case 'wave_results':
      case 'finished':
        let score = 0;
        const waveQuestion =
          wave.questions[questionIndex || wave.questions.length - 1];
        let actualQuestionAnswer = null;
        let actualQuestionAnswerAt = null;
        let progress = new Array(wave.questionsAmount).fill(
          WaveProgressItem.EMPTY,
        );
        let leaderboard = null;
        if (lobbyId) {
          const playerProgress = await this.getPlayerProgress(
            lobbyId,
            userId,
            status === 'question_revealed'
              ? questionIndex || wave.questions.length - 1
              : undefined,
          );
          progress = playerProgress.history;
          score = playerProgress.score;
          if (typeof questionIndex === 'number') {
            const [partialQuestionStateRes, boostsAppliedRes] =
              await Promise.all([
                this._redisRepository.getQuestionPartialState(
                  userId,
                  lobbyId,
                  questionIndex,
                ),
                this._redisRepository.getBoostsApplied(userId, lobbyId),
              ]);
            partialQuestionSate = partialQuestionStateRes;
            appliedBoosts = boostsAppliedRes;
            this._logger.debug('Got partialQuestionSate', {
              partialQuestionSate,
              appliedBoosts,
            });
          }
          if (
            ['question_results', 'question_revealed'].includes(status) &&
            fetchAnswer
          ) {
            const userAnswer =
              await this._wavePlayerActionsService.getPlayerAnswer(
                lobbyId,
                userId,
                waveQuestion.id,
              );
            this._logger.debug('Got user answer', {userAnswer});
            if (userAnswer) {
              actualQuestionAnswer = userAnswer.data.selectedIndexes;
              actualQuestionAnswerAt = userAnswer.emittedAt;
            }
          }
          // get current leaderboard
          const lobby = await this._lobbyService.getLobbyById(lobbyId);
          if (lobby && !lobby.zeroLobby) {
            leaderboard =
              await this._leaderboardService.getByLobbyIdForWaveScreen(
                userId,
                lobbyId,
              );
          }
        }
        if (status === 'finished') {
          const now = Date.now();
          let passedFromFinish = 0;
          let showAt: Date = new Date();
          if (wave.finishAt) {
            showAt = new Date(wave.finishAt.getTime() + delayToShowEndScreenMs);
            passedFromFinish = now - wave.finishAt.getTime();
          }
          if (
            passedFromFinish < delayToShowEndScreenMs &&
            passedFromFinish > 0
          ) {
            showAt = new Date(
              Date.now() + delayToShowEndScreenMs - passedFromFinish,
            );
          }
          screenToReturn = new BeforeWaveDto(
            showAt,
            null,
            currentKingDto,
            null,
          );
          return screenToReturn;
        }
        if (status === 'wave_results') {
          if (
            trophiesRewarded === undefined ||
            lootRewardedAmount === undefined
          ) {
            trophiesRewarded = 0;
            lootRewardedAmount = 0;
            if (lobbyId !== null) {
              const tx = await this._trophyTxService.getUserTrophyTx(
                userId,
                lobbyId,
              );
              if (tx) {
                trophiesRewarded = tx.amount;
                lootRewardedAmount = tx.lootIds ? tx.lootIds.length : 0;
              }
            }
          }
          screenToReturn = new ResultWaveLobbyDto(
            wave.showResolveAt || new Date(),
            lobbyId,
            progress,
            score,
            appliedBoosts && appliedBoosts.length
              ? new Map(
                  appliedBoosts.map((appliedBoost) => [
                    appliedBoost.questionIndex,
                    new AppliedBoostDto(
                      appliedBoost.boostId,
                      appliedBoost.appliedAt,
                    ),
                  ]),
                )
              : new Map(),
            //TODO: move to configs
            3,
            trophiesRewarded,
            lootRewardedAmount,
            leaderboard,
          );
          return screenToReturn;
        }
        screenToReturn = new ActiveWaveLobbyDto(
          waveQuestion.showAt,
          lobbyId,
          progress,
          score,
          status === 'question_generated'
            ? null
            : new WaveQuestionDto(
                // TODO startAt
                waveQuestion.startAt,
                waveQuestion.finishAt,
                // TODO: process i18n
                new QuestionDto(
                  new RawDynamicTextDto(waveQuestion.question.title),
                  waveQuestion.question.options.map(
                    (option) => new RawDynamicTextDto(option),
                  ),
                ),
                partialQuestionSate
                  ? partialQuestionSate.minScore
                  : waveQuestion.minScore,
                partialQuestionSate
                  ? partialQuestionSate.maxScore
                  : waveQuestion.maxScore,
                new Map(
                  Object.entries(waveQuestion.titleVars || {}).map((entry) => [
                    entry[0],
                    new RawDynamicTextDto(entry[1]),
                  ]),
                ) as unknown as Map<
                  DynamicTextVariableKey,
                  OneOfDynamicTextDto
                >,
                waveQuestion.optionsVars
                  ? (waveQuestion.optionsVars.map(
                      (optionVars) =>
                        new Map(
                          Object.entries(optionVars).map((entry) => [
                            entry[0],
                            new RawDynamicTextDto(entry[1]),
                          ]),
                        ),
                    ) as unknown as Map<
                      DynamicTextVariableKey,
                      OneOfDynamicTextDto
                    >[])
                  : [],
                partialQuestionSate
                  ? partialQuestionSate.buttonMapper
                  : waveQuestion.question.options.map((_val, i) => [i]),
                actualQuestionAnswer,
                actualQuestionAnswerAt,
                status === 'question_results'
                  ? waveQuestion.correctAnswerIndexes
                  : null,
              ),
          waveQuestion.questionIndex,
          appliedBoosts && appliedBoosts.length
            ? new Map(
                appliedBoosts.map((appliedBoost) => [
                  appliedBoost.questionIndex,
                  new AppliedBoostDto(
                    appliedBoost.boostId,
                    appliedBoost.appliedAt,
                  ),
                ]),
              )
            : new Map(),
          //TODO: move to configs
          3,
          wave.id,
          waveQuestion.id,
          leaderboard,
        );
        return screenToReturn;
        break;
      default:
        return screenToReturn;
        break;
    }
  }

  public async returnActualChannelWaveToClient(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<unknown> {
    // TODO: add cache/memoization
    const params = asClass(KosWavesCurrentWaveParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );
    const appId: KosClientAppId = 'kos-twitch';
    await this._wsSubscriptionsService.setSubscription({
      connectionId: connectionId,
      userId,
      passedId: subMessage.id,
      namespace: subMessage.namespace,
      params: asClass(KosWavesCurrentWaveParamsDto).dataToLiteral(
        params,
      ) as Record<string, string>,
    });

    /**
     * this sub is considered as a start of the session on the extension
     * TODO: discuss other possible ways to detect users' sessions on channels
     */
    await this._channelSessionService.startUserChannelSession(
      connectionId,
      params.channelId,
      userId,
      appId,
    );

    const wave = await this.getActualChannelWave(params.channelId);
    let participation: LobbyParticipantEntity | null = null;
    if (wave) {
      if (!['finished', 'awaiting'].includes(wave.status)) {
        participation = await this.joinUserToZeroLobby(wave, userId);
      }
      if (!participation) {
        participation = await this._lobbyService.getUserParticipation(
          userId,
          wave.id,
        );
      }
    }
    const waveScreen = await this.getWaveScreenForPlayer(
      params.channelId,
      userId,
      participation ? participation.lobbyId : null,
      wave || null,
      null,
      true,
    );
    return asKosWavesCurrentWaveNextDto().dataToLiteral(waveScreen);
  }

  public async getActualChannelWave(
    channelId: string,
  ): Promise<WaveEntity | null> {
    return this._waveRepository.getLatestWave(channelId);
  }

  public async joinUserToZeroLobby(
    wave: WaveEntity,
    userId: KosUserId,
  ): Promise<LobbyParticipantEntity | null> {
    const participation = await this._lobbyService.upsertLobbyParticipation(
      wave.id,
      userId,
      wave.channelId as TwitchChannelId,
      wave.zeroLobbyId,
    );
    if (participation === null) {
      return participation;
    }
    this._logger.debug('Creating new participation', {
      participation,
    });
    const {redisClient} = this._redisClientService;
    await redisClient.lpush(
      `${KOS_USER_LOBBY_PROGRESS}:${userId}:${wave.zeroLobbyId}`,
      new Array(wave.questionsAmount).fill(
        JSON.stringify({ps: WaveProgressItem.EMPTY, sa: 0}),
      ),
    );
    await redisClient.expire(
      `${KOS_USER_LOBBY_PROGRESS}:${userId}:${wave.zeroLobbyId}`,
      getRandomInt(2 * 60 * 60, 3 * 60 * 60),
    );
    return participation;
  }

  public async getLastResolvedWave(
    channelId: string,
  ): Promise<WaveEntity | null> {
    const wave = await this._waveRepository.getLastResolvedWave(channelId);
    return wave || null;
  }

  public async getWaveById(id: number): Promise<WaveEntity | null> {
    const wave = await this._waveRepository.getWaveById(id);
    this._logger.debug('Wave received by id', {wave});
    return wave || null;
  }

  public async updateWaveStatus(
    waveId: number,
    status: WaveStatus,
  ): Promise<UpdateResult> {
    return this._waveRepository.updateWaveStatus(waveId, status);
  }

  public async updateWave(
    waveId: number,
    data: Partial<Wave>,
  ): Promise<UpdateResult> {
    return this._waveRepository.updateWave(waveId, data);
  }

  public async createWaveQuestion(
    data: // {lobbyId: number} &
    Partial<WaveQuestion>,
  ): Promise<WaveQuestion> {
    return this._waveQuestionRepository.createWaveQuestion(data);
  }

  public async resolveWave(
    waveId: number,
    showResolveIn: number,
  ): Promise<Date> {
    const lobbies = await this._lobbyService.getAllWaveLobbies(waveId);

    const usersUpdates: {id: KosUserId; trophies: number; level: number}[] = [];
    const trophyTxs: {
      waveId: number;
      lobbyId: WaveLobbyId;
      userId: KosUserId;
      amount: number;
      lootIds: KosLootId[] | null;
    }[] = [];
    const lootsUpdates: {
      userId: KosUserId;
      lootId: KosLootId;
      amount: number;
    }[] = [];

    for (const lobby of lobbies) {
      const lobbyId = lobby.id;
      const leaderboard =
        await this._wavePlayerActionsService.getAdvancedLobbyLeaderboard(
          lobbyId,
        );
      for (const user of leaderboard) {
        if (lobby.zeroLobby) {
          lootsUpdates.push({
            userId: user.userId,
            lootId: 'WaveSmallChest' as KosLootId,
            amount: 1,
          });
          trophyTxs.push({
            waveId,
            lobbyId,
            userId: user.userId,
            amount: 0,
            lootIds: ['WaveSmallChest' as KosLootId],
          });
        } else {
          let trophiesAmountToPass = waveResultConf.levelsTrophies.get(
            user.level,
          );

          let earnedTrophiesAmount =
            waveResultConf.leaderboardPositionReward.get(+user.position) || 0;

          let earnedLootId = waveResultConf.leaderboardPositionLoot.get(
            +user.position,
          );
          if (earnedLootId === undefined) {
            earnedLootId = 'WaveSmallBag' as KosLootId;
          }
          lootsUpdates.push({
            userId: user.userId,
            lootId: earnedLootId,
            amount: 1,
          });
          // user cannot loose trophies on level 1
          if (user.level === 1 && earnedTrophiesAmount < 0) {
            earnedTrophiesAmount = 0;
          }
          let newTrophiesAmount = Math.max(
            user.trophies + earnedTrophiesAmount,
            0,
          );
          let newUserLevel = user.level;
          if (!trophiesAmountToPass) {
            // if user has reached max level(which is not defined in the rules) increase his max trophies amount
            trophiesAmountToPass = Math.floor(newTrophiesAmount * 1.3);
          }
          trophyTxs.push({
            waveId,
            lobbyId,
            userId: user.userId,
            amount: earnedTrophiesAmount,
            lootIds: [earnedLootId],
          });
          if (newTrophiesAmount >= trophiesAmountToPass) {
            newTrophiesAmount -= trophiesAmountToPass;
            ++newUserLevel;
          }
          usersUpdates.push({
            id: user.userId,
            level: newUserLevel,
            trophies: newTrophiesAmount,
          });
        }
      }
      if (lootsUpdates.length >= 1000) {
        // TODO: use db txs
        await Promise.all([
          this._usersService.trophiesBatchUpdate(usersUpdates),
          this._lootsService.upsertUsersLootsAmount(lootsUpdates),
        ]);
        try {
          await this._trophyTxService.insertTxs(trophyTxs);
        } catch (error) {
          this._logger.error(error);
        }
        this._eventEmitter.emit(`${KOS_USER}.${USER_STATE}.${EMIT_CHANGES}`, [
          ...usersUpdates,
        ]);
        this._eventEmitter.emit(
          `${KOS_USER}.${USER_STATE}.${EMIT_LOOTS_AMOUNT_UPDATE}`,
          [
            ...lootsUpdates.map((lootUpdate) => ({
              userId: lootUpdate.userId,
              delta: 1,
              lootId: lootUpdate.lootId,
            })),
          ],
        );
        usersUpdates.length = 0;
        trophyTxs.length = 0;
        lootsUpdates.length = 0;
      }
    }
    if (lootsUpdates.length) {
      // TODO: use db txs
      await Promise.all([
        this._usersService.trophiesBatchUpdate(usersUpdates),
        this._lootsService.upsertUsersLootsAmount(lootsUpdates),
      ]);
      try {
        await this._trophyTxService.insertTxs(trophyTxs);
      } catch (error) {
        this._logger.error(error);
      }
      this._eventEmitter.emit(`${KOS_USER}.${USER_STATE}.${EMIT_CHANGES}`, [
        ...usersUpdates,
      ]);
      this._eventEmitter.emit(
        `${KOS_USER}.${USER_STATE}.${EMIT_LOOTS_AMOUNT_UPDATE}`,
        [
          ...lootsUpdates.map((lootUpdate) => ({
            userId: lootUpdate.userId,
            delta: 1,
            lootId: lootUpdate.lootId,
          })),
        ],
      );
      usersUpdates.length = 0;
      trophyTxs.length = 0;
      lootsUpdates.length = 0;
    }
    const resolveAt = new Date();
    const showResolveAt = new Date(Date.now() + showResolveIn);
    const finishAt = new Date(
      showResolveAt.getTime() + delayToShowWaveResultsMs,
    );
    await this._waveRepository.update(
      {id: waveId},
      {resolveAt, showResolveAt, finishAt, status: 'wave_results'},
    );
    return finishAt;
  }

  public async processUserAnswer(
    subMessage: ClientSubscribeFrameLiteral,
    _connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<any> {
    // get current user

    const now = Date.now();
    // TODO: move logic to the enabler
    const params = asClass(KosWavesSelectAnswerIndexesParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );
    // TODO: send lobbyId from the client and only verify here
    const wave = await this.getActualChannelWave(params.channelId);
    let participation: LobbyParticipantEntity | null = null;
    if (!wave) {
      this._logger.warn('Wave does not exits', {params});
      throw new Error('Wave or lobby do not exist');
    }
    participation = await this._lobbyService.getUserParticipation(
      userId,
      wave.id,
    );
    if (!participation) {
      this._logger.warn('Participation does not exits', {params, userId, wave});
      throw new Error('Wave or lobby do not exist');
    }
    let selectedAtMs = params.selectedAnswerAt.getTime();
    if (now < selectedAtMs) {
      this._logger.warn('The time synchronization issue', {
        now: new Date(now).toISOString(),
        params,
      });
      selectedAtMs = now;
    }
    if (now - selectedAtMs >= 3000) {
      this._logger.warn('The time allowed range issue', {
        now: new Date(now).toISOString(),
        params,
      });
      throw new WsServerError(
        subMessage.id,
        `Wrong selectedAnswerAt. Server time: ${new Date().toISOString()}`,
      );
    }
    const lobbyId = {...participation}.lobbyId;
    this._logger.debug('Lobby id', {lobbyId, participation});
    /** TODO:
     * validate timestamp, indexes, lobby, already selected indexes,
     * probably add constraint to the player action in db or
     * keep answers in redis temporary and migrate them to db later
     */
    //Process correct answer, compute stars to distribute and count used boosts

    const waveQuestion = wave.questions.find(
      (question) => question.questionIndex === params.questionIndex,
    );
    if (!waveQuestion) {
      throw new WsServerError(subMessage.id, 'Question does not exist');
    }

    const partialQuestionState =
      await this._redisRepository.getQuestionPartialState(
        userId,
        lobbyId,
        params.questionIndex,
      );
    if (
      waveQuestion.startAt.getTime() > selectedAtMs ||
      waveQuestion.finishAt.getTime() < selectedAtMs
    ) {
      this._logger.warn('The question time ranges issue', {
        now: new Date(now).toISOString(),
        params,
        waveQuestion,
      });
      throw new WsServerError(
        subMessage.id,
        `selectedAnswerAt does not correlate with question time`,
      );
    }
    let won = false;
    let starsDistributed = 0;
    let minScore = waveQuestion.minScore;
    let maxScore = waveQuestion.maxScore;
    if (partialQuestionState) {
      minScore = partialQuestionState.minScore;
      maxScore = partialQuestionState.maxScore;
    }
    if (
      waveQuestion.correctAnswerIndexes.some((correctIndex) =>
        params.selectedAnswerIndexes.includes(correctIndex),
      )
    ) {
      won = true;
      starsDistributed = mapToIntegerInLimits(
        params.selectedAnswerAt.getTime(),
        [waveQuestion.startAt.getTime(), maxScore],
        [waveQuestion.finishAt.getTime(), minScore],
      );
    }
    /** TODO:
     * add constraint to the player action in db or
     * keep answers in redis/dynamodb temporary and migrate them to db later
     */
    const userAnswer = await this._wavePlayerActionsService.getPlayerAnswer(
      lobbyId,
      userId,
      waveQuestion.id,
    );
    if (userAnswer) {
      this._logger.warn('User already answered', {
        userId,
        userAnswer,
        subMessage,
      });
      throw new WsServerError(subMessage.id, 'The user already answered.');
    }
    if (partialQuestionState && partialQuestionState.appliedBoost) {
      const boost = this._boostsService.getBoostById(
        partialQuestionState.appliedBoost.boostId,
      );
      this._logger.debug('boost received', {
        boost,
        starsDistributed,
      });
      if (boost.mutateCalculatedStars) {
        starsDistributed = boost.getBoostedScoreValue(
          starsDistributed,
          selectedAtMs,
          waveQuestion.startAt.getTime(),
          waveQuestion.finishAt.getTime(),
        );
        this._logger.debug('Mutated starsDistributed', {
          starsDistributed,
        });
      }
    }
    let progressItem = won ? WaveProgressItem.PASSED : WaveProgressItem.FAILED;
    const {redisClient} = this._redisClientService;
    const [playerAction] = await Promise.all([
      this._wavePlayerActionsService.createPlayerAction({
        waveId: wave.id,
        lobbyId: lobbyId,
        userId,
        channelId: params.channelId,
        actionType: 'answer',
        emittedAt: params.selectedAnswerAt,
        data: {
          questionIndex: params.questionIndex,
          selectedIndexes: params.selectedAnswerIndexes,
        },
        won,
        starsDistributed,
        waveQuestionId: waveQuestion.id,
      }),
      redisClient.lset(
        `${KOS_USER_LOBBY_PROGRESS}:${userId}:${lobbyId}`,
        params.questionIndex,
        JSON.stringify({ps: progressItem, sa: starsDistributed}),
      ),
    ]);
    // TODO: consider typeorm entity events
    this._eventEmitter.emit(
      `${KOS_CHANNEL}.${WAVE_PARTICIPANT}.${SEND_SELECTED_ANSWER}`,
      wave,
      lobbyId,
      playerAction.userId,
      params.questionIndex,
    );
  }

  @OnEvent(`${KOS_CHANNEL}.${WAVE_PARTICIPANT}.${SEND_SELECTED_ANSWER}`)
  public async sendSelectedAnswer(
    wave: Wave,
    lobbyId: WaveLobbyId,
    userId: KosUserId,
    questionIndex: number,
    userChannelSessionsAmount?: number,
  ): Promise<void> {
    let sessionsAmount = userChannelSessionsAmount;
    if (typeof sessionsAmount !== 'number') {
      sessionsAmount =
        await this._channelSessionService.getUserChannelSessionsAmount(
          userId,
          wave.channelId,
        );
    }
    if (sessionsAmount > 1) {
      //emit redis pubsub
      this._client.emit<
        SystemEvents.BROADCAST_WAVE_QUESTION_SELECTED_INDEXES,
        {
          // TODO: define type
          waveId: number;
          userId: KosUserId;
          questionIndex: number;
        }
      >(SystemEvents.BROADCAST_WAVE_QUESTION_SELECTED_INDEXES, {
        waveId: wave.id,
        userId,
        questionIndex,
      });
    } else {
      const subscriptions = this._wsSubscriptionsService.getSubscriptions(
        RemoteNamespaceType.WAVES,
        {channelId: wave.channelId},
        userId,
      );
      for (const subscription of subscriptions) {
        const waveScreen = await this.getWaveScreenForPlayer(
          subscription.params.channelId as string,
          userId,
          lobbyId,
          wave,
          questionIndex,
          true,
          'question_revealed',
        );
        this._wsConnectionService.sendMessage(subscription.connectionId, {
          id: subscription.passedId,
          type: ServerFrameType.NEXT,
          next: asKosWavesCurrentWaveNextDto().dataToLiteral(waveScreen),
        });
      }
    }
  }

  public async emptyChannelHistory(
    channelId: string,
    till?: Date,
  ): Promise<void> {
    let findQuery: FindManyOptions<WaveEntity> = {where: {channelId}};
    if (till) {
      findQuery = {where: {channelId, startAt: LessThan(till)}};
    }
    const waves = await this._waveRepository.find(findQuery);
    for (const wave of waves) {
      const lobbyIds = await this._lobbyService.getAllWaveLobbyIds(wave.id);
      for (const lobbyId of lobbyIds) {
        await this._trophyTxService.delAllTrophyTxsByLobbyId(lobbyId);
      }
    }
    if (waves.length) {
      const actionsDelRes =
        await this._wavePlayerActionsService.deleteQuestionAnswers(
          channelId,
          till,
        );
      const participantsDelRes =
        await this._lobbyService.deleteAllParticipantsInWave(
          waves.map((wave) => wave.id),
        );
      const lobbiesDelRes = await this._lobbyService.deleteAllLobbiesInWave(
        waves.map((wave) => wave.id),
      );
      const questionsDelRes = await this._waveQuestionRepository.delete({
        waveId: In(waves.map((wave) => wave.id)),
      });
      const wavesDelRes = await this._waveRepository.delete({
        id: In(waves.map((wave) => wave.id)),
      });
      this._logger.log('Channel history empty', {
        actionsDelRes,
        participantsDelRes,
        lobbiesDelRes,
        questionsDelRes,
        wavesDelRes,
      });
    }
  }

  public async getWaveConf(channelId: string): Promise<WaveSettings> {
    // TODO: get wave settings from the channel entity when it is ready
    if (
      ['42', 'super-debug-fake-all-questions-answer-42', '113888380'].includes(
        channelId,
      )
    ) {
      return devWaveConf;
    }
    return waveConf;
  }

  public async getWaveQuestion(
    waveId: number,
    questionIndex: number,
  ): Promise<WaveQuestionEntity | undefined> {
    return this._waveQuestionRepository.findOne({
      where: {waveId, questionIndex},
    });
  }

  public async getWaveStatus(waveId: number): Promise<WaveStatus | null> {
    return this._waveRepository.getWaveStatus(waveId);
  }
}

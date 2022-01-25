import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {validateSync} from 'class-validator';
import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from 'unique-names-generator';

import {asClass} from '../../../agnostic/common-lib/src/transformer/class/as-class';
import {KosAccessTokenPayload} from '../../../agnostic/kos-lib/src/auth/kos-access-token.payload';
import {KosBoostId} from '../../../agnostic/kos-lib/src/dto/boost/kos-boost-id';
import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {KosDebugDelayedHandlingParamsDto} from '../../../agnostic/kos-lib/src/endpoint/debug/delayed-handling/kos-debug-delayed-handling-params.dto';
import {KosDebugDeleteUserBoostParamsDto} from '../../../agnostic/kos-lib/src/endpoint/debug/delete-user-boost/kos-debug-delete-user-boost-params.dto';
import {DebugForceDrainingParamsDto} from '../../../agnostic/kos-lib/src/endpoint/debug/force-draining/debug-force-draining-params.dto';
import {KosDebugSetUserBoostParamsDto} from '../../../agnostic/kos-lib/src/endpoint/debug/set-user-boost/kos-debug-set-user-boost-params.dto';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {ServerCompleteFrameLiteral} from '../../../agnostic/reactive-data/server-complete-frame-literal';
import {ServerFrameType} from '../../../agnostic/reactive-data/server-frame-type';
import {SupportedGames} from '../../../agnostic/supported-games';
// import * as _stats from '../../../tmp/stats.json';
import {WinstonLogger} from '../../common/logger/logger.service';
import {RedisRepository} from '../../common/redis/redis.repository';
import {Environments} from '../../common/types/environments';
import {UserBoostEmitState} from '../../common/types/kos-boosts/user-boost-emit-state';
import {QuestionDifficulty} from '../../common/types/question-library/question-difficulty';
import {TriviaQuestion} from '../../common/types/question-library/trivia-question';
import {WaveTriggerEvents} from '../../common/types/services-communication/bull/kos-enabler-jobs-arguments/wave-trigger-event';
import {NotaryStatsLolMessage} from '../../common/types/services-communication/notary-stats-lol-message';
import {SystemEvents} from '../../common/types/ws/system-events';
import redisConfig from '../../kos-config/redis/configuration';
import {KosEnablerService} from '../../kos-enabler/kos-enabler.service';
import {MAX_DRAINING_TIMEOUT_MS} from '../../kos-ws-server/src/state/constants';
import {WsServerError} from '../../kos-ws-server/src/ws/ws-server-error.class';
import {getRandomInt} from '../../utils/rand-int.util';
import {sleep} from '../../utils/sleep.util';
import {BoostsService} from '../boosts/boosts.service';
import {QuestionsLibraryService} from '../questions-library/questions-library.service';
import {UsersService} from '../users/users.service';
import {WavesService} from '../waves/waves.service';
import {WsConnectionService} from '../ws-connections/ws-connections.service';
import {WsTasksService} from '../ws-tasks/ws-tasks.service';

const clientOptions: ClientOptions = {
  transport: Transport.REDIS,
  options: redisConfig,
};

@Injectable()
export class DebugService {
  private readonly _client: ClientProxy;
  private readonly _logger: WinstonLogger = new WinstonLogger(
    DebugService.name,
  );
  public constructor(
    private _wsConnectionService: WsConnectionService,
    private _wsTasksService: WsTasksService,
    private _usersService: UsersService,
    private _boostsService: BoostsService,
    private _jwtService: JwtService,
    private _questionsLibraryService: QuestionsLibraryService,
    private readonly _redisRepository: RedisRepository,
    private readonly _wavesService: WavesService,
    private readonly _kosEnablerService: KosEnablerService,
  ) {
    this._client = ClientProxyFactory.create(clientOptions);
  }

  public async setDrainingPeriod(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
  ): Promise<ServerCompleteFrameLiteral | null> {
    this._logger.debug('setDrainingPeriod', {
      subMessage,
      connectionId,
    });
    const complete: ServerCompleteFrameLiteral = {
      id: subMessage.id,
      type: ServerFrameType.COMPLETE,
    };
    /**
     * this method is only for debugging on staging
     */
    if ((process.env.NODE_ENV as Environments) === Environments.PRODUCTION) {
      return complete;
    }
    const parsedParams = asClass(DebugForceDrainingParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );
    if (parsedParams.timeout !== null) {
      const validationRes = validateSync(parsedParams);
      if (validationRes.length) {
        const err = new WsServerError(
          subMessage.id,
          JSON.stringify(validationRes),
        );
        throw err;
      }
    }
    this._wsConnectionService.sendMessage(connectionId, {
      id: subMessage.id,
      type: ServerFrameType.COMPLETE,
    });
    this._wsConnectionService.sendMessage(connectionId, {
      type: ServerFrameType.DRAINING,
    });
    this._wsConnectionService.updateConnectionInternalStatus(
      connectionId,
      'DRAINING',
    );
    let drainingTimeout = parsedParams.timeout
      ? parsedParams.timeout
      : MAX_DRAINING_TIMEOUT_MS;
    await sleep(drainingTimeout);
    this._wsTasksService.deletePingTask(connectionId);
    this._wsConnectionService.closeConnection(connectionId);
    return null;
  }

  public async delayedHandling(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId?: KosUserId,
  ): Promise<ServerCompleteFrameLiteral> {
    this._logger.debug('setDelayedHandling', {
      subMessage,
      connectionId,
      userId,
    });
    const complete: ServerCompleteFrameLiteral = {
      id: subMessage.id,
      type: ServerFrameType.COMPLETE,
    };
    /**
     * this method is only for debugging on staging
     */
    if ((process.env.NODE_ENV as Environments) === Environments.PRODUCTION) {
      return complete;
    }
    const parsedParams = asClass(
      KosDebugDelayedHandlingParamsDto,
    ).literalToData(subMessage.params, ['params']);
    if (parsedParams.timeout !== null) {
      const validationRes = validateSync(parsedParams);
      if (validationRes.length) {
        const err = new WsServerError(
          subMessage.id,
          JSON.stringify(validationRes),
        );
        throw err;
      }
    }
    let delay = parsedParams.timeout
      ? parsedParams.timeout
      : MAX_DRAINING_TIMEOUT_MS;
    await sleep(delay);
    return complete;
  }

  public async setUserBoost(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
  ): Promise<ServerCompleteFrameLiteral> {
    this._logger.debug('setDelayedHandling', {
      subMessage,
      connectionId,
    });
    const complete: ServerCompleteFrameLiteral = {
      id: subMessage.id,
      type: ServerFrameType.COMPLETE,
    };
    /**
     * this method is only for debugging on staging
     */
    if ((process.env.NODE_ENV as Environments) === Environments.PRODUCTION) {
      return complete;
    }
    const parsedParams = asClass(KosDebugSetUserBoostParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );
    const validationRes = validateSync(parsedParams);
    if (validationRes.length) {
      const err = new WsServerError(
        subMessage.id,
        JSON.stringify(validationRes),
      );
      throw err;
    }
    const user = await this._usersService.getUserById(parsedParams.userId);
    if (!user) {
      const err = new WsServerError(
        subMessage.id,
        `User ${parsedParams.userId} does not exist`,
      );
      throw err;
    }
    await this._boostsService.setUserBoostAmount(
      parsedParams.userId,
      parsedParams.boostId,
      parsedParams.amount,
    );
    this._client.emit<SystemEvents.NEW_USER_BOOST_STATE, UserBoostEmitState>(
      SystemEvents.NEW_USER_BOOST_STATE,
      {
        params: {
          boostId: parsedParams.boostId,
          userId: parsedParams.userId,
        },
        boostState: {amount: parsedParams.amount},
      },
    );
    return complete;
  }

  public async deleteUserBoost(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
  ): Promise<ServerCompleteFrameLiteral> {
    this._logger.debug('setDelayedHandling', {
      subMessage,
      connectionId,
    });
    const complete: ServerCompleteFrameLiteral = {
      id: subMessage.id,
      type: ServerFrameType.COMPLETE,
    };
    /**
     * this method is only for debugging on staging
     */
    if ((process.env.NODE_ENV as Environments) === Environments.PRODUCTION) {
      return complete;
    }
    const parsedParams = asClass(
      KosDebugDeleteUserBoostParamsDto,
    ).literalToData(subMessage.params, ['params']);
    const validationRes = validateSync(parsedParams);
    if (validationRes.length) {
      const err = new WsServerError(
        subMessage.id,
        JSON.stringify(validationRes),
      );
      throw err;
    }
    const user = await this._usersService.getUserById(parsedParams.userId);
    if (!user) {
      const err = new WsServerError(
        subMessage.id,
        `User ${parsedParams.userId} does not exist`,
      );
      throw err;
    }
    await this._boostsService.deleteUserBoost(
      parsedParams.userId,
      parsedParams.boostId,
    );
    this._client.emit<SystemEvents.NEW_USER_BOOST_STATE, UserBoostEmitState>(
      SystemEvents.NEW_USER_BOOST_STATE,
      {
        params: {
          boostId: parsedParams.boostId,
          userId: parsedParams.userId,
        },
        boostState: null,
      },
    );
    return complete;
  }

  public async getTmpToken(): Promise<{token: string}> {
    this._logger.debug('getTmpToken');
    /**
     * this method is only for debugging on staging
     */
    if ((process.env.NODE_ENV as Environments) === Environments.PRODUCTION) {
      return {
        token: '',
      };
    }
    // TODO: remove after auth will be done on extension
    const randomName = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      length: 2,
      separator: ' ',
      style: 'capital',
    });
    const user = await this._usersService.createUser({name: randomName});
    await Promise.all([
      this._boostsService.setUserBoostAmount(
        user.id,
        'Bomb' as KosBoostId,
        getRandomInt(3, 10),
      ),
      this._boostsService.setUserBoostAmount(
        user.id,
        'ReverseScore' as KosBoostId,
        getRandomInt(3, 10),
      ),
      this._boostsService.setUserBoostAmount(
        user.id,
        'SuperStar' as KosBoostId,
        getRandomInt(3, 10),
      ),
    ]);
    const payload: KosAccessTokenPayload = {
      userId: user.id,
      creator: false,
      verified: false,
    };

    return {
      token: this._jwtService.sign(payload),
    };
  }

  public async getAttentionQuestionsState(channelId: string): Promise<any> {
    const warnings: string[] = [];
    let [lastWave, waveConf, stats] = await Promise.all([
      this._wavesService.getActualChannelWave(channelId),
      this._wavesService.getWaveConf(channelId),
      this._redisRepository.getGameStats(channelId, SupportedGames.LOL),
    ]);
    // stats = (_stats as unknown) as NotaryStatsLolMessage[];
    if (
      !lastWave ||
      (lastWave.finishAt &&
        Date.now() - lastWave.finishAt.getTime() >
          waveConf.waveIntermissionMs * 1.5)
    ) {
      warnings.push('The wave is not scheduled');
    }
    let waveReason = WaveTriggerEvents.GAME_CONTINUES;
    if (lastWave) {
      waveReason = this._kosEnablerService.checkLolWaveReason(
        lastWave.reason,
        stats,
        waveConf,
      );
    }
    const availableDifficulty = [
      QuestionDifficulty.VERY_EASY,
      QuestionDifficulty.EASY,
      QuestionDifficulty.MEDIUM,
      QuestionDifficulty.DIFFICULT,
      QuestionDifficulty.VERY_DIFFICULT,
    ];
    const [
      {question: randomRelevantQuestion},
      {question: randomCommonQuestion},
      {debugData},
    ] = await Promise.all([
      this._questionsLibraryService.getRandomAttentionQuestion(
        stats as unknown as NotaryStatsLolMessage[],
        SupportedGames.LOL,
        waveReason,
        Date.now(),
        channelId,
        availableDifficulty[getRandomInt(0, availableDifficulty.length - 1)],
        'attention-relevant',
      ),
      this._questionsLibraryService.getRandomAttentionQuestion(
        stats as unknown as NotaryStatsLolMessage[],
        SupportedGames.LOL,
        waveReason,
        Date.now(),
        channelId,
        availableDifficulty[getRandomInt(0, availableDifficulty.length - 1)],
        'attention-common',
      ),
      this._questionsLibraryService.getRandomAttentionQuestion(
        stats as unknown as NotaryStatsLolMessage[],
        SupportedGames.LOL,
        waveReason,
        Date.now(),
        channelId,
        availableDifficulty[getRandomInt(0, availableDifficulty.length - 1)],
        'attention-common',
        true,
      ),
    ]);
    const availableQuestionsByDifficulty: any[] = [];
    if (debugData) {
      if (debugData.message) {
        warnings.push(debugData.message);
      }
      for (const difficulty of availableDifficulty) {
        if (debugData.availableQuestions) {
          const item: any = {difficulty};
          const questions = debugData.availableQuestions[difficulty];
          item.commonQuestions = (
            await Promise.all(
              questions.commonQuestions.map((quest) =>
                quest.build(stats, difficulty, waveConf),
              ),
            )
          ).sort((a, b) => (a && b ? a.id - b.id : 0));
          item.relevantQuestions = (
            await Promise.all(
              questions.eventsRelevant.map((quest) =>
                quest.build(stats, difficulty, waveConf),
              ),
            )
          ).sort((a, b) => (a && b ? a.id - b.id : 0));
          availableQuestionsByDifficulty.push(item);
        }
      }
    }
    return {
      warnings,
      waveReason,
      randomCommonQuestion,
      randomRelevantQuestion,
      availableQuestionsByDifficulty,
      filteredQuestions: debugData?.excludedQuestions,
      filteredTags: debugData?.excludedCorrelationTags,
    };
  }

  public getAllTrivias(game: SupportedGames): any {
    switch (game) {
      case SupportedGames.LOL:
        return this._questionsLibraryService.getAllLolTrivias();
        break;

      default:
        throw new HttpException(
          `${game} is not supported`,
          HttpStatus.BAD_REQUEST,
        );
        break;
    }
  }

  public async getTriviaQuestionsState(
    channelId: string,
    game: SupportedGames,
  ): Promise<any> {
    const availableDifficulty = [
      QuestionDifficulty.VERY_EASY,
      QuestionDifficulty.EASY,
      QuestionDifficulty.MEDIUM,
      QuestionDifficulty.DIFFICULT,
      QuestionDifficulty.VERY_DIFFICULT,
    ];
    const availableTriviasByDifficulty: {
      difficulty: QuestionDifficulty;
      filteredTrivias: number[];
      availableTrivias: TriviaQuestion[];
    }[] = [];
    const promises = [];
    promises.push(
      this._questionsLibraryService.getRandomTriviaQuestion(
        game,
        channelId,
        availableDifficulty[getRandomInt(0, availableDifficulty.length - 1)],
      ),
    );
    for (const difficulty of availableDifficulty) {
      promises.push(
        this._questionsLibraryService
          .getRandomTriviaQuestion(game, channelId, difficulty, true)
          .then((res) => {
            availableTriviasByDifficulty.push({
              difficulty,
              filteredTrivias: res.filteredTrivias ? res.filteredTrivias : [],
              availableTrivias: res.availableTrivias
                ? res.availableTrivias
                : [],
            });
            return res;
          }),
      );
    }
    const [{question: randomTriviaQuestion}] = await Promise.all(promises);
    return {
      availableTriviasByDifficulty,
      randomTriviaQuestion,
    };
  }
}

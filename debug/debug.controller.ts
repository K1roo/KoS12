import {Controller, Get, Param, Render} from '@nestjs/common';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {RemoteNamespaceType} from '../../../agnostic/reactive-data/remote-namespace-type';
import {ServerCompleteFrameLiteral} from '../../../agnostic/reactive-data/server-complete-frame-literal';
import {SupportedGames} from '../../../agnostic/supported-games';
import {Environments} from '../../common/types/environments';
import {RemoteMethod} from '../../kos-ws-server/src/decorators/remote-method.decorator';
import {RemoteNamespace} from '../../kos-ws-server/src/decorators/remote-namespace.decorator';

import {DebugService} from './debug.service';

@Controller(RemoteNamespaceType.DEBUG)
@RemoteNamespace(RemoteNamespaceType.DEBUG)
export class DebugController {
  public constructor(private readonly _debugService: DebugService) {}

  @RemoteMethod()
  public async forceDraining(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
  ): Promise<ServerCompleteFrameLiteral | null> {
    return this._debugService.setDrainingPeriod(subMessage, connectionId);
  }

  @RemoteMethod()
  public async delayedHandling(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId?: KosUserId,
  ): Promise<ServerCompleteFrameLiteral | null> {
    return this._debugService.delayedHandling(subMessage, connectionId, userId);
  }

  @RemoteMethod()
  public async setUserBoost(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
  ): Promise<ServerCompleteFrameLiteral | null> {
    return this._debugService.setUserBoost(subMessage, connectionId);
  }

  @RemoteMethod()
  public async deleteUserBoost(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
  ): Promise<ServerCompleteFrameLiteral | null> {
    return this._debugService.deleteUserBoost(subMessage, connectionId);
  }

  @Get('tmp-token')
  public async getTemporaryToken(): Promise<{token: string}> {
    return this._debugService.getTmpToken();
  }

  @Get('attention-questions/:channelId')
  @Render('available-attention-questions')
  public async getAttentionQuestionsState(
    @Param('channelId') channelId: string,
  ): Promise<any> {
    let res = {
      warnings: [],
      waveReason: '',
      filteredQuestions: [],
      filteredTags: [],
      randomCommonQuestion: null,
      randomRelevantQuestion: null,
      availableQuestionsByDifficulty: [],
    } as any;
    if (process.env.NODE_ENV !== Environments.PRODUCTION) {
      res = await this._debugService.getAttentionQuestionsState(channelId);
    }
    return {
      warnings: res.warnings,
      waveReason: res.waveReason,
      filteredQuestions: res.filteredQuestions,
      filteredTags: res.filteredTags,
      randomRelevantQuestion: res.randomRelevantQuestion,
      randomCommonQuestion: res.randomCommonQuestion,
      questionsByDifficulty: res.availableQuestionsByDifficulty,
    };
  }

  @Get('trivia-questions/:game')
  @Render('trivia-questions')
  public getTrivias(@Param('game') game: SupportedGames): any {
    const res = {
      game,
      trivias: [],
    };
    if (process.env.NODE_ENV !== Environments.PRODUCTION) {
      res.trivias = this._debugService.getAllTrivias(game);
    }
    return res;
  }

  @Get('trivia-questions/:game/:channelId')
  @Render('available-trivia-questions')
  public async getTriviaQuestionsState(
    @Param('game') game: SupportedGames,
    @Param('channelId') channelId: string,
  ): Promise<any> {
    let res = {
      randomTriviaQuestion: null,
      availableTriviasByDifficulty: [],
    } as any;
    if (process.env.NODE_ENV !== Environments.PRODUCTION) {
      const debugData = await this._debugService.getTriviaQuestionsState(
        channelId,
        game,
      );
      res.randomTriviaQuestion = debugData.randomTriviaQuestion;
      res.availableTriviasByDifficulty = debugData.availableTriviasByDifficulty;
    }
    return {
      randomTrivia: res.randomTriviaQuestion,
      questionsByDifficulty: res.availableTriviasByDifficulty,
    };
  }
}

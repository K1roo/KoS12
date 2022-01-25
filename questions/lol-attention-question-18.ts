import {Injectable} from '@nestjs/common';

import {SupportedGames} from '../../../../../../agnostic/supported-games';
import {WinstonLogger} from '../../../../../common/logger/logger.service';
import {WaveSettings} from '../../../../../common/types/configs/wave-settings';
import {LolAttentionQuestion} from '../../../../../common/types/question-library/lol/lol-attention-question';
import {lolAttentionQuestionsDifficultyMap} from '../../../../../common/types/question-library/lol/lol-attention-questions-difficulty-map';
import {LolCorrelationTag} from '../../../../../common/types/question-library/lol/lol-correlation-tag';
import {LolGameModes} from '../../../../../common/types/question-library/lol/lol-game-modes';
import {QuestionContentType} from '../../../../../common/types/question-library/question-content-type';
import {QuestionDifficulty} from '../../../../../common/types/question-library/question-difficulty';
import {StaticQuestion} from '../../../../../common/types/question-library/static-question';
import {WaveTriggerEvents} from '../../../../../common/types/services-communication/bull/kos-enabler-jobs-arguments/wave-trigger-event';
import {NotaryStatsLolMessage} from '../../../../../common/types/services-communication/notary-stats-lol-message';
import {getGameStartEvent} from '../../utils/get-game-start-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion18 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion18.name,
  );
  public readonly id = 18;
  public readonly title = 'Which team killed the first tower?';
  public readonly titleVars = {};
  // eslint-disable-next-line quotes
  public readonly options = ["Streamer's Team", 'Enemy Team'];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.DIFFICULT];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['FirstBrick'];

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
  ) {
    super();
    this._lolAttentionQuestionsService.registerQuestion(this);
  }

  public readonly isRelevant = (stats: NotaryStatsLolMessage[]): boolean => {
    return stats.some(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        statEvent.data.stats.val.EventName === 'FirstBrick',
    );
  };
  public readonly build = async (
    stats: NotaryStatsLolMessage[],
    difficulty: QuestionDifficulty,
    _waveConf: WaveSettings,
  ): Promise<StaticQuestion | null> => {
    if (!this.availableDifficulty.includes(difficulty)) {
      this._logger.error(new Error(`Unsupported difficulty: ${difficulty}`));
      return null;
    }
    let correctAnswerIndexes = [1];
    const firstBrickEvent = stats.find(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        statEvent.data.stats.val.EventName === 'FirstBrick',
    );
    if (
      !firstBrickEvent ||
      typeof firstBrickEvent.data.stats.val !== 'object'
    ) {
      this._logger.warn('Not enough data to build the question', {
        firstBrickEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const killerName = firstBrickEvent.data.stats.val.KillerName;
    const gameStartEvent = getGameStartEvent(stats);
    if (
      !gameStartEvent ||
      !gameStartEvent.data.stats.explicitData.allPlayers ||
      !gameStartEvent.data.stats.explicitData.allPlayers.length
    ) {
      this._logger.warn('Not enough data to build the question', {
        gameStartEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    let streamerTeam = '';
    const streamerEntity = (
      gameStartEvent.data.stats.explicitData.allPlayers as {
        summonerName: string;
        championName: string;
        team: string;
        scores: {kills: number; deaths: number};
      }[]
    ).find(
      (player) => player.summonerName === gameStartEvent.data.summonerName,
    );
    if (!streamerEntity) {
      this._logger.warn('Not enough data to build the question', {
        gameStartEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    streamerTeam = streamerEntity.team;
    for (const player of gameStartEvent.data.stats.explicitData.allPlayers) {
      if (player.team === streamerTeam && player.summonerName === killerName) {
        correctAnswerIndexes = [0];
        break;
      }
    }
    this._logger.verbose('Question data and args', {
      streamerTeam,
      streamerEntity,
      gameStartEvent,
    });

    return {
      id: this.id,
      title: this.title,
      titleVars: this.titleVars,
      options: this.options,
      optionsVars: null,
      i18n: {title: null, options: null},
      contentType: this.contentType,
      game: SupportedGames.LOL,
      difficulty,
      defaultMinScore: lolAttentionQuestionsDifficultyMap[difficulty].minValue,
      defaultMaxScore: lolAttentionQuestionsDifficultyMap[difficulty].maxValue,
      correctAnswerIndexes,
      type: 'attention-relevant',
      correlationTags: this.correlationTags,
    };
  };
}

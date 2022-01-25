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
import {getRandomInt} from '../../../../../utils/rand-int.util';
import {getGameEndEvent} from '../../utils/get-game-end-event';
import {getGameStartEvent} from '../../utils/get-game-start-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion49 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion49.name,
  );
  public readonly id = 49;
  public readonly title = 'Who reached a Penta kill during the game?';
  public readonly titleVars = {};
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.MEDIUM];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC];
  public readonly correlationTags: LolCorrelationTag[] = ['Multikill'];

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
        statEvent.data.stats.val.KillStreak === 5 &&
        statEvent.data.stats.val.EventName === 'Multikill',
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
    const gameEndOrStartEvent =
      getGameEndEvent(stats) || getGameStartEvent(stats);
    if (
      !gameEndOrStartEvent ||
      !gameEndOrStartEvent.data.stats.explicitData.allPlayers ||
      !gameEndOrStartEvent.data.stats.explicitData.allPlayers.length
    ) {
      this._logger.warn('Not enough data to build the question', {
        gameEndOrStartEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const pentaKillers = [
      ...new Set(
        stats
          .filter(
            (statEvent) =>
              typeof statEvent.data.stats.val === 'object' &&
              statEvent.data.stats.val.KillStreak === 5 &&
              typeof statEvent.data.stats.val.KillerName === 'string' &&
              statEvent.data.stats.val.EventName === 'Multikill',
          )
          .map(
            (event) =>
              (event.data.stats.val as Record<string, string>).KillerName,
          ),
      ),
    ];
    if (!pentaKillers.length) {
      this._logger.warn('Not enough data to build the question', {
        pentaKillers,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const multiKillers = [
      ...new Set(
        stats
          .filter(
            (statEvent) =>
              typeof statEvent.data.stats.val === 'object' &&
              typeof statEvent.data.stats.val.KillerName === 'string' &&
              !pentaKillers.includes(statEvent.data.stats.val.KillerName) &&
              statEvent.data.stats.val.EventName === 'Multikill',
          )
          .map(
            (event) =>
              (event.data.stats.val as Record<string, string>).KillerName,
          ),
      ),
    ];
    const playersSortedByKills = (
      gameEndOrStartEvent.data.stats.explicitData.allPlayers as {
        summonerName: string;
        championName: string;
        team: string;
        scores: {kills: number; deaths: number};
      }[]
    )
      .sort((a, b) => b.scores.kills - a.scores.kills)
      .map((player) => player.summonerName);

    const championsMap = new Map<string, string>(
      gameEndOrStartEvent.data.stats.explicitData.allPlayers.map(
        (player: any) => [
          player.summonerName as string,
          player.championName as string,
        ],
      ),
    );
    const answerIndexes = [0, 1, 2, 3];
    if (pentaKillers.length > 4) pentaKillers.length = 4;
    const correctAnswerIndexes = pentaKillers.map(
      (_val) =>
        answerIndexes.splice(getRandomInt(0, answerIndexes.length - 1), 1)[0],
    );
    const options = new Array(4)
      .fill('')
      .map((_v, i) => {
        if (correctAnswerIndexes.includes(i)) {
          return pentaKillers.splice(0, 1)[0];
        } else {
          const [randomMultikiller] = multiKillers.length
            ? multiKillers.splice(getRandomInt(0, multiKillers.length - 1), 1)
            : playersSortedByKills.splice(0, 1);
          return randomMultikiller;
        }
      })
      .map((option) =>
        championsMap.has(option)
          ? `${championsMap.get(option)} (${option})`
          : option,
      );
    return {
      id: this.id,
      title: this.title,
      titleVars: this.titleVars,
      options,
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

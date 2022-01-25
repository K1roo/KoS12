/* eslint-disable @typescript-eslint/naming-convention */

import {Injectable} from '@angular/core';

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
import {getTimeRanges} from '../../utils/get-time-ranges';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion9 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion9.name,
  );
  public readonly id = 9;
  public readonly title = 'When was first dragon killed?';
  public readonly titleVars = {};
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [
    QuestionDifficulty.EASY,
    QuestionDifficulty.MEDIUM,
    QuestionDifficulty.DIFFICULT,
    QuestionDifficulty.VERY_DIFFICULT,
  ];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_START,
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC];
  public readonly correlationTags: LolCorrelationTag[] = ['DragonKill'];
  private readonly _optionTimeStepsInSeconds = new Map([
    [QuestionDifficulty.EASY, 3 * 60],
    [QuestionDifficulty.MEDIUM, 2 * 60],
    [QuestionDifficulty.DIFFICULT, 1 * 60],
    [QuestionDifficulty.VERY_DIFFICULT, 30],
  ]);

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
        statEvent.data.stats.val.EventName === 'DragonKill',
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
    const dragonKillEvent = (
      stats.filter(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          typeof statEvent.data.stats.val.EventTime === 'number' &&
          statEvent.data.stats.val.EventName === 'DragonKill',
      ) as unknown as {
        data: {
          stats: {
            val: {
              EventTime: number;
            };
          };
        };
      }[]
    ).sort(
      (a, b) => a.data.stats.val.EventTime - b.data.stats.val.EventTime,
    )[0];
    if (
      !dragonKillEvent ||
      typeof dragonKillEvent.data.stats.val !== 'object' ||
      !dragonKillEvent.data.stats.val.EventTime
    ) {
      this._logger.warn('Not enough data to build the question', {
        dragonKillEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const eventTime = dragonKillEvent.data.stats.val.EventTime;
    const {options, correctIndex} = getTimeRanges(
      eventTime,
      4,
      this._optionTimeStepsInSeconds.get(difficulty) || 60,
    );
    this._logger.verbose('Question data and args', {
      eventTime,
      correctIndex,
      options,
    });
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
      correctAnswerIndexes: [correctIndex],
      type: 'attention-relevant',
      correlationTags: this.correlationTags,
    };
  };
}

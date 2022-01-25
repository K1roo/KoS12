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
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion24 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion24.name,
  );
  public readonly id = 24;
  public readonly title = 'How many Inhibitors did {{streamerName}} last hit?';
  public readonly titleVars = {
    streamerName: 'streamer',
  };
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [
    QuestionDifficulty.MEDIUM,
    QuestionDifficulty.DIFFICULT,
    QuestionDifficulty.VERY_DIFFICULT,
  ];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['InhibKilled'];

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
        statEvent.data.stats.val.EventName === 'InhibKilled' &&
        statEvent.data.stats.val.KillerName === statEvent.data.summonerName,
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
    const inhibitorsKilledAmount = stats.filter(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        typeof statEvent.data.stats.val.EventTime === 'number' &&
        statEvent.data.stats.val.EventName === 'InhibKilled' &&
        statEvent.data.stats.val.KillerName === statEvent.data.summonerName,
    ).length;
    if (!inhibitorsKilledAmount) {
      this._logger.warn('Not enough data to build the question', {
        inhibitorsKilledAmount,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    let step = 2;
    switch (difficulty) {
      case QuestionDifficulty.MEDIUM:
        step = 3;
        break;
      case QuestionDifficulty.DIFFICULT:
        step = 2;
        break;
      case QuestionDifficulty.VERY_DIFFICULT:
        step = 1;
        break;
    }
    let correctAnswerIndex = 0;
    if (inhibitorsKilledAmount >= step) correctAnswerIndex = getRandomInt(0, 1);
    if (inhibitorsKilledAmount >= step * 2)
      correctAnswerIndex = getRandomInt(0, 2);
    if (inhibitorsKilledAmount >= step * 3)
      correctAnswerIndex = getRandomInt(0, 3);
    const options = new Array(4).fill('');
    let j = 0;
    for (let i = correctAnswerIndex; i < options.length; i++) {
      switch (difficulty) {
        case QuestionDifficulty.MEDIUM:
          options[i] = `${j * step + inhibitorsKilledAmount}+`;
          break;
        case QuestionDifficulty.DIFFICULT:
          options[i] = `${j * step + inhibitorsKilledAmount}+`;
          break;
        case QuestionDifficulty.VERY_DIFFICULT:
          options[i] = `${j * step + inhibitorsKilledAmount}`;
      }
      j++;
    }
    if (correctAnswerIndex !== 0) {
      let k = 1;
      for (let i = correctAnswerIndex - 1; i >= 0; i--) {
        switch (difficulty) {
          case QuestionDifficulty.MEDIUM:
            options[i] = `${inhibitorsKilledAmount - k * step}+`;
            break;
          case QuestionDifficulty.DIFFICULT:
            options[i] = `${inhibitorsKilledAmount - k * step}+`;
            break;
          case QuestionDifficulty.VERY_DIFFICULT:
            options[i] = `${inhibitorsKilledAmount - k * step}`;
        }
        k++;
      }
    }
    this._logger.verbose('Question data and args', {
      inhibitorsKilledAmount,
      step,
      correctAnswerIndex,
      options,
    });
    return {
      id: this.id,
      title: this.title,
      titleVars: {
        streamerName: stats[0].data.summonerName || this.titleVars.streamerName,
      },
      options,
      optionsVars: null,
      i18n: {title: null, options: null},
      contentType: this.contentType,
      game: SupportedGames.LOL,
      difficulty,
      defaultMinScore: lolAttentionQuestionsDifficultyMap[difficulty].minValue,
      defaultMaxScore: lolAttentionQuestionsDifficultyMap[difficulty].maxValue,
      correctAnswerIndexes: [correctAnswerIndex],
      type: 'attention-relevant',
      correlationTags: this.correlationTags,
    };
  };
}

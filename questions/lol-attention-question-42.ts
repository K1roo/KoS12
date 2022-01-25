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
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion42 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion42.name,
  );
  public readonly id = 42;
  public readonly title =
    'What the maximum multi-kills streak did {{streamerName}} reach?';
  public readonly titleVars = {streamerName: 'streamer'};
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.EASY];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['Multikill'];
  private readonly _staticOptions: Record<QuestionDifficulty.EASY, string[]> = {
    [QuestionDifficulty.EASY]: ['2', '3', '4', '5'],
  };

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
  ) {
    super();
    this._lolAttentionQuestionsService.registerQuestion(this);
  }

  public readonly isRelevant = (stats: NotaryStatsLolMessage[]): boolean => {
    const streamerName = stats[0].data.summonerName;
    return stats.some(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        statEvent.data.stats.val.EventName === 'Multikill' &&
        statEvent.data.stats.val.KillerName === streamerName,
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
    const streamerName = stats[0].data.summonerName;
    if (!streamerName) {
      this._logger.warn('Not enough data to build the question', {
        difficulty,
        streamerName,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const streamerMaxMultiKillEvent = stats
      .filter(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          typeof statEvent.data.stats.val.KillStreak === 'number' &&
          statEvent.data.stats.val.EventName &&
          statEvent.data.stats.val.KillerName === streamerName &&
          statEvent.data.stats.val.EventName === 'Multikill',
      )
      .sort(
        (a, b) =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (b.data.stats.val! as Record<string, number>).KillStreak -
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (a.data.stats.val! as Record<string, number>).KillStreak,
      )[0];
    if (
      !streamerMaxMultiKillEvent ||
      typeof streamerMaxMultiKillEvent.data.stats.val !== 'object' ||
      typeof streamerMaxMultiKillEvent.data.stats.val.KillStreak !== 'number' ||
      streamerMaxMultiKillEvent.data.stats.val.KillStreak <= 1
    ) {
      this._logger.warn('Not enough data to build the question', {
        streamerMaxMultiKillEvent,
        difficulty,
        streamerName,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    let correctAnswerIndex = 0;
    const killStreak = streamerMaxMultiKillEvent.data.stats.val.KillStreak;
    if (killStreak === 2) {
      correctAnswerIndex = 0;
    } else if (killStreak === 3) {
      correctAnswerIndex = 1;
    } else if (killStreak === 4) {
      correctAnswerIndex = 2;
    } else {
      correctAnswerIndex = 3;
    }

    return {
      id: this.id,
      title: this.title,
      titleVars: {streamerName},
      options:
        this._staticOptions[difficulty as QuestionDifficulty.EASY].slice(0),
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

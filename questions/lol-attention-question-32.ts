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
export class LolAttentionQuestion32 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion32.name,
  );
  public readonly id = 32;
  public readonly title =
    'Which trinket did {{streamerName}} start with this game?';
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
  public readonly availableDifficulty = [QuestionDifficulty.VERY_EASY];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_START,
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC];
  public readonly correlationTags: LolCorrelationTag[] = ['General'];
  private _staticOptions: Record<QuestionDifficulty.VERY_EASY, string[]> = {
    [QuestionDifficulty.VERY_EASY]: ['Stealth Ward', 'Oracle Lens'],
  };

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
        statEvent.data.stats.op === 'add' &&
        statEvent.data.summonerName ===
          statEvent.data.stats.explicitData.playerSummonerName &&
        /**
         * 3364 - Oracle Lens
         * 3340 - Stealth Ward
         */
        [3364, 3340].includes(statEvent.data.stats.val.itemID),
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
    const [neededEvent] = stats
      .filter(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          statEvent.data.stats.op === 'add' &&
          statEvent.data.summonerName ===
            statEvent.data.stats.explicitData.playerSummonerName &&
          /**
           * 3364 - Oracle Lens
           * 3340 - Stealth Ward
           */
          [3364, 3340].includes(statEvent.data.stats.val.itemID),
      )
      .sort(
        (a, b) =>
          new Date(a.data.receivedAt).getTime() -
          new Date(b.data.receivedAt).getTime(),
      );
    this._logger.verbose('Question data and args', {
      neededEvent,
    });
    if (!neededEvent) {
      this._logger.warn('Not enough data to build the question', {
        stats,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    let correctAnswerIndex = 0;
    if (
      typeof neededEvent.data.stats.val === 'object' &&
      neededEvent.data.stats.val.itemID === 3364
    ) {
      correctAnswerIndex = 1;
    }
    return {
      id: this.id,
      title: this.title,
      titleVars: {
        streamerName: stats[0].data.summonerName || this.titleVars.streamerName,
      },
      options: this._staticOptions[difficulty as QuestionDifficulty.VERY_EASY],
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

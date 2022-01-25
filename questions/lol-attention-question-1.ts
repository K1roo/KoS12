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
export class LolAttentionQuestion1 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion1.name,
  );
  public readonly id = 1;
  public readonly title = 'Did {{streamerName}} die in the last game?';
  public readonly titleVars = {
    streamerName: 'streamer',
  };
  public readonly options = ['Yes', 'No'];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.VERY_EASY];
  public readonly appropriateWaveTriggers = [WaveTriggerEvents.GAME_END];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = [
    'CurrentPlayerDeaths',
  ];

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
  ) {
    super();
    this._lolAttentionQuestionsService.registerQuestion(this);
  }

  public readonly isRelevant = (..._args: unknown[]): null => null;
  public readonly build = async (
    stats: NotaryStatsLolMessage[],
    difficulty: QuestionDifficulty,
    _waveConf: WaveSettings,
  ): Promise<StaticQuestion | null> => {
    if (!this.availableDifficulty.includes(difficulty)) {
      this._logger.error(new Error(`Unsupported difficulty: ${difficulty}`));
      return null;
    }
    const wasKilled = stats.some(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        statEvent.data.stats.val.EventName === 'ChampionKill' &&
        statEvent.data.stats.val.VictimName === statEvent.data.summonerName,
    );
    this._logger.verbose('Question data and args', {
      wasKilled,
      difficulty,
    });
    return {
      id: this.id,
      title: this.title,
      titleVars: {
        streamerName: stats[0].data.summonerName || this.titleVars.streamerName,
      },
      options: this.options,
      optionsVars: null,
      i18n: {title: null, options: null},
      contentType: this.contentType,
      game: SupportedGames.LOL,
      difficulty: QuestionDifficulty.VERY_EASY,
      defaultMinScore: lolAttentionQuestionsDifficultyMap[difficulty].minValue,
      defaultMaxScore: lolAttentionQuestionsDifficultyMap[difficulty].maxValue,
      correctAnswerIndexes: wasKilled ? [0] : [1],
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

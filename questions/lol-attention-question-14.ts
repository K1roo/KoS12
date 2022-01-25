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
export class LolAttentionQuestion14 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion14.name,
  );
  public readonly id = 14;
  public readonly title =
    'How many assists did {{streamerName}} have last game?';
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
    QuestionDifficulty.EASY,
    QuestionDifficulty.MEDIUM,
  ];
  public readonly appropriateWaveTriggers = [WaveTriggerEvents.GAME_END];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['General'];

  private _staticOptions: Record<
    QuestionDifficulty.EASY | QuestionDifficulty.MEDIUM,
    string[]
  > = {
    [QuestionDifficulty.EASY]: ['<10', '>=10'],
    [QuestionDifficulty.MEDIUM]: ['<10', '10+', '15+', '20+'],
  };

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
    const streamerName = stats[0].data.summonerName;
    if (!streamerName) {
      this._logger.warn('Not enough data to build the question', {
        streamerName,
        stats0: stats[0],
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const streamerAssists = stats.filter(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        statEvent.data.stats.val.EventName === 'ChampionKill' &&
        statEvent.data.stats.val.Assisters &&
        statEvent.data.stats.val.Assisters.includes(
          statEvent.data.summonerName,
        ),
    ).length;
    const options: string[] =
      this._staticOptions[
        difficulty as QuestionDifficulty.EASY | QuestionDifficulty.MEDIUM
      ];
    let correctAnswerIndex = 0;
    switch (difficulty) {
      case QuestionDifficulty.EASY:
        if (streamerAssists < 10) correctAnswerIndex = 0;
        if (streamerAssists >= 10) correctAnswerIndex = 1;
        break;
      case QuestionDifficulty.EASY:
        if (streamerAssists >= 20) correctAnswerIndex = 3;
        if (streamerAssists >= 15) correctAnswerIndex = 2;
        if (streamerAssists >= 10) correctAnswerIndex = 1;
        if (streamerAssists < 10) correctAnswerIndex = 0;
        break;

      default:
        break;
    }
    return {
      id: this.id,
      title: this.title,
      titleVars: {
        streamerName,
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
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

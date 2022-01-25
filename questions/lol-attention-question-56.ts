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
import {getTimeRanges} from '../../utils/get-time-ranges';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion56 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion56.name,
  );
  public readonly id = 56;
  public readonly title =
    'When did {{streamerName}} get the first assist this game?';
  public readonly titleVars = {streamerName: 'streamer'};
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
  ];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = [
    'CurrentPlayerAssists',
  ];
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
        statEvent.data.stats.val.EventName === 'ChampionKill' &&
        typeof statEvent.data.summonerName === 'string' &&
        Array.isArray(statEvent.data.stats.val.Assisters) &&
        statEvent.data.stats.val.Assisters.includes(
          statEvent.data.summonerName,
        ),
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
    const [firstStreamerAssist] = stats
      .filter(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          statEvent.data.stats.val.EventName &&
          statEvent.data.stats.val.EventName === 'ChampionKill' &&
          typeof statEvent.data.summonerName === 'string' &&
          Array.isArray(statEvent.data.stats.val.Assisters) &&
          statEvent.data.stats.val.Assisters.includes(
            statEvent.data.summonerName,
          ),
      )
      .sort((a, b) => a.data.stats.receivedAt - b.data.stats.receivedAt);
    if (
      !firstStreamerAssist ||
      typeof firstStreamerAssist.data.stats.val !== 'object' ||
      !firstStreamerAssist.data.stats.val.EventTime
    ) {
      this._logger.warn('Not enough data to build the question', {
        firstStreamerAssist,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const eventTime = firstStreamerAssist.data.stats.val.EventTime;
    const streamerName = firstStreamerAssist.data.summonerName;
    const {options, correctIndex} = getTimeRanges(
      eventTime,
      4,
      this._optionTimeStepsInSeconds.get(difficulty) || 60,
    );
    this._logger.verbose('Question data and args', {
      firstStreamerAssist,
      eventTime,
      correctIndex,
      options,
    });
    return {
      id: this.id,
      title: this.title,
      titleVars: {streamerName},
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

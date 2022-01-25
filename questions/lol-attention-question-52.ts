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
export class LolAttentionQuestion52 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion52.name,
  );
  public readonly id = 52;
  public readonly title =
    'How much time was spent dead by {{streamerName}} this game?';
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
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = [
    'CurrentPlayerDeaths',
  ];
  private readonly _optionTimeStepsInSeconds = new Map([
    [QuestionDifficulty.EASY, 1 * 60],
    [QuestionDifficulty.MEDIUM, 40],
    [QuestionDifficulty.DIFFICULT, 20],
    [QuestionDifficulty.VERY_DIFFICULT, 10],
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
        statEvent.data.stats.receivedAt &&
        typeof statEvent.data.stats.receivedAt === 'number' &&
        statEvent.data.stats.op === 'update' &&
        typeof statEvent.data.stats.val === 'number' &&
        statEvent.data.stats.path &&
        statEvent.data.stats.path.length &&
        statEvent.data.stats.path.length === 3 &&
        statEvent.data.stats.path[2] === 'respawnTimer' &&
        typeof statEvent.data.stats.explicitData.playerSummonerName ===
          'string' &&
        statEvent.data.summonerName ===
          statEvent.data.stats.explicitData.playerSummonerName,
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
    const respawnTimerEvents = stats.filter(
      (statEvent) =>
        statEvent.data.stats.receivedAt &&
        typeof statEvent.data.stats.receivedAt === 'number' &&
        statEvent.data.stats.op === 'update' &&
        typeof statEvent.data.stats.val === 'number' &&
        statEvent.data.stats.path &&
        statEvent.data.stats.path.length &&
        statEvent.data.stats.path.length === 3 &&
        statEvent.data.stats.path[2] === 'respawnTimer' &&
        typeof statEvent.data.stats.explicitData.playerSummonerName ===
          'string' &&
        statEvent.data.summonerName ===
          statEvent.data.stats.explicitData.playerSummonerName,
    );
    if (!streamerName || !respawnTimerEvents.length) {
      this._logger.warn('Not enough data to build the question', {
        streamerName,
        respawnTimerEvents,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const respawnTimeSum = respawnTimerEvents.reduce(
      (acc, val) => acc + (val.data.stats.val as number),
      0,
    );
    const {options, correctIndex} = getTimeRanges(
      Math.round(respawnTimeSum),
      4,
      this._optionTimeStepsInSeconds.get(difficulty) || 60,
    );

    this._logger.verbose('Question data and args', {
      respawnTimerEvents,
      respawnTimeSum,
      correctIndex,
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

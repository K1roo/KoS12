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
import {getGameStartEvent} from '../../utils/get-game-start-event';
import {getTimeRanges} from '../../utils/get-time-ranges';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion55 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion55.name,
  );
  public readonly id = 55;
  public readonly title =
    'When did {{streamerName}} reach {{goldThreshold}} total gold this game?';
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
  public readonly correlationTags: LolCorrelationTag[] = ['CurrentPlayerGold'];
  private readonly _optionTimeStepsInSeconds = new Map([
    [QuestionDifficulty.EASY, 5 * 60],
    [QuestionDifficulty.MEDIUM, 4 * 60],
    [QuestionDifficulty.DIFFICULT, 3 * 60],
    [QuestionDifficulty.VERY_DIFFICULT, 2 * 60],
  ]);

  private readonly _goldThresholds = [3000, 5000, 8000, 10000, 12000];

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
  ) {
    super();
    this._lolAttentionQuestionsService.registerQuestion(this);
  }
  /**
   *
   * @param {NotaryStatsLolMessage[]} stats
   * @returns {NotaryStatsLolMessage[]}
   * @description -
   * 1) filters stats with only gold updates of the current player
   * 2) computes total reached gold in each event stage
   * 2) filters gold update events where totalGoldValue >= one of the thresholds
   */
  private _getGoldEventsWithDesiredTotalAmount(
    stats: NotaryStatsLolMessage[],
  ): NotaryStatsLolMessage[] {
    const goldEvents = stats
      .filter(
        (statEvent) =>
          statEvent.data.stats.op === 'update' &&
          statEvent.data.stats.path &&
          statEvent.data.stats.path.length &&
          statEvent.data.stats.path.length === 2 &&
          statEvent.data.stats.path[0] === 'activePlayer' &&
          statEvent.data.stats.path[1] === 'currentGold' &&
          typeof statEvent.data.stats.val === 'number' &&
          typeof statEvent.data.stats.oldVal === 'number',
      )
      .sort((a, b) => a.data.stats.receivedAt - b.data.stats.receivedAt)
      .reduce((updatedData: NotaryStatsLolMessage[], event) => {
        // count all spent gold previously
        let currentSpendGold = updatedData.reduce(
          (acc: number, val, _i, _array) => {
            if (
              (val.data.stats.val as number) < (val.data.stats.oldVal as number)
            ) {
              acc +=
                (val.data.stats.oldVal as number) -
                (val.data.stats.val as number);
            }
            return acc;
          },
          0,
        );
        // check current event if it has gold spent too
        if (
          (event.data.stats.val as number) < (event.data.stats.oldVal as number)
        ) {
          currentSpendGold +=
            (event.data.stats.oldVal as number) -
            (event.data.stats.val as number);
        }
        event.data.stats.explicitData.totalGoldValue =
          (event.data.stats.val as number) + currentSpendGold;
        updatedData.push(event);
        return updatedData;
      }, []);
    return this._goldThresholds.reduce(
      (acc: NotaryStatsLolMessage[], threshold) => {
        // find the first value that matches a given threshold
        const event = goldEvents.find(
          (ev) => ev.data.stats.explicitData.totalGoldValue >= threshold,
        );
        if (event) {
          event.data.stats.explicitData.threshold = threshold;
          acc.push(event);
        }
        return acc;
      },
      [],
    );
  }

  public readonly isRelevant = (stats: NotaryStatsLolMessage[]): boolean => {
    return !!this._getGoldEventsWithDesiredTotalAmount(stats).length;
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
    const goldEvents = this._getGoldEventsWithDesiredTotalAmount(stats);
    const gameStartEvent = getGameStartEvent(stats);
    if (!streamerName || !goldEvents.length || !gameStartEvent) {
      this._logger.warn('Not enough data to build the question', {
        streamerName,
        goldEvents,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const randomGoldEvent = goldEvents[getRandomInt(0, goldEvents.length - 1)];
    const goldThreshold = randomGoldEvent.data.stats.explicitData
      .threshold as number;
    const {receivedAt: goldThresholdReachedAt} = randomGoldEvent.data.stats;
    const {receivedAt: gameStartEventAt} = gameStartEvent.data.stats;
    const eventTime = Math.floor(
      (goldThresholdReachedAt - gameStartEventAt) / 1000,
    );
    const {options, correctIndex} = getTimeRanges(
      eventTime,
      4,
      this._optionTimeStepsInSeconds.get(difficulty) || 60,
    );
    this._logger.verbose('Question data and args', {
      goldEvents,
      randomGoldEvent,
      gameStartEvent,
      eventTime,
      correctIndex,
    });
    return {
      id: this.id,
      title: this.title,
      titleVars: {streamerName, goldThreshold: goldThreshold.toString()},
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

import {Injectable} from '@nestjs/common';

import {shuffleArray} from '../../../../../../agnostic/common-lib/src/utils/shuffle-array';
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
export class LolAttentionQuestion51 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion51.name,
  );
  public readonly id = 51;
  public readonly title = 'When did {{streamerName}} hit lvl {{lvl}}?';
  public readonly titleVars = {streamerName: 'streamer', lvl: 'lvl'};
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
  public readonly correlationTags: LolCorrelationTag[] = ['CurrentPlayerLevel'];
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
        statEvent.data.stats.receivedAt &&
        typeof statEvent.data.stats.receivedAt === 'number' &&
        statEvent.data.stats.op === 'update' &&
        statEvent.data.stats.explicitData &&
        statEvent.data.stats.explicitData.currentActivePlayerLevel &&
        statEvent.data.stats.explicitData.currentActivePlayerLevel >= 4 &&
        statEvent.data.stats.path &&
        statEvent.data.stats.path.length &&
        statEvent.data.stats.path.length === 2 &&
        statEvent.data.stats.path[0] === 'activePlayer' &&
        statEvent.data.stats.path[1] === 'level',
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
    const levelUpdateEvents = stats.filter(
      (statEvent) =>
        statEvent.data.stats.receivedAt &&
        typeof statEvent.data.stats.receivedAt === 'number' &&
        statEvent.data.stats.op === 'update' &&
        statEvent.data.stats.explicitData &&
        statEvent.data.stats.explicitData.currentActivePlayerLevel &&
        statEvent.data.stats.explicitData.currentActivePlayerLevel >= 4 &&
        statEvent.data.stats.path &&
        statEvent.data.stats.path.length &&
        statEvent.data.stats.path.length === 2 &&
        statEvent.data.stats.path[0] === 'activePlayer' &&
        statEvent.data.stats.path[1] === 'level',
    );
    const gameStartEvent = getGameStartEvent(stats);
    if (!streamerName || !levelUpdateEvents.length || !gameStartEvent) {
      this._logger.warn('Not enough data to build the question', {
        streamerName,
        levelUpdateEvents,
        gameStartEvent,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    shuffleArray(levelUpdateEvents);
    const levelUpdateEvent =
      levelUpdateEvents[getRandomInt(0, levelUpdateEvents.length - 1)];
    const lvl =
      levelUpdateEvent.data.stats.explicitData.currentActivePlayerLevel;
    const {receivedAt: levelUpdateEventAt} = levelUpdateEvent.data.stats;
    const {receivedAt: gameStartEventAt} = gameStartEvent.data.stats;
    const eventTime = Math.floor(
      (levelUpdateEventAt - gameStartEventAt) / 1000,
    );
    const {options, correctIndex} = getTimeRanges(
      eventTime,
      4,
      this._optionTimeStepsInSeconds.get(difficulty) || 60,
    );

    this._logger.verbose('Question data and args', {
      gameStartEvent,
      levelUpdateEvent,
      eventTime,
      correctIndex,
      lvl,
    });
    return {
      id: this.id,
      title: this.title,
      titleVars: {streamerName, lvl: lvl.toString()},
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

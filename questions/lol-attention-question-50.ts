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
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion50 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion50.name,
  );
  public readonly id = 50;
  public readonly title =
    'Which ability did {{streamerName}} choose to upgrade lvl {{lvl}}?';
  public readonly titleVars = {streamerName: 'streamer', lvl: 'lvl'};
  public readonly options = ['Q', 'W', 'E', 'R'];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.MEDIUM];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_START,
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = [
    'CurrentPlayerAbility',
  ];

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
  ) {
    super();
    this._lolAttentionQuestionsService.registerQuestion(this);
  }

  public readonly isRelevant = (stats: NotaryStatsLolMessage[]): boolean => {
    return stats.some(
      (statEvent) =>
        statEvent.data.stats.op === 'update' &&
        statEvent.data.stats.path &&
        statEvent.data.stats.path.length &&
        statEvent.data.stats.path.length === 4 &&
        statEvent.data.stats.path[0] === 'activePlayer' &&
        statEvent.data.stats.path[1] === 'abilities' &&
        typeof statEvent.data.stats.path[2] === 'string' &&
        this.options.includes(statEvent.data.stats.path[2]) &&
        statEvent.data.stats.path[3] === 'abilityLevel' &&
        typeof statEvent.data.stats.explicitData === 'object' &&
        typeof statEvent.data.stats.explicitData.currentActivePlayerLevel ===
          'number',
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
    const abilityUpgrades = stats.filter(
      (statEvent) =>
        statEvent.data.stats.op === 'update' &&
        statEvent.data.stats.path &&
        statEvent.data.stats.path.length &&
        statEvent.data.stats.path.length === 4 &&
        statEvent.data.stats.path[0] === 'activePlayer' &&
        statEvent.data.stats.path[1] === 'abilities' &&
        typeof statEvent.data.stats.path[2] === 'string' &&
        this.options.includes(statEvent.data.stats.path[2]) &&
        statEvent.data.stats.path[3] === 'abilityLevel' &&
        typeof statEvent.data.stats.explicitData === 'object' &&
        typeof statEvent.data.stats.explicitData.currentActivePlayerLevel ===
          'number',
    );
    if (!streamerName || !abilityUpgrades.length) {
      this._logger.warn('Not enough data to build the question', {
        streamerName,
        abilityUpgrades,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    shuffleArray(abilityUpgrades);
    const upgradeEvent =
      abilityUpgrades[getRandomInt(0, abilityUpgrades.length - 1)];
    const options = this.options.slice(0);
    const correctIndex = options.indexOf(
      upgradeEvent.data.stats.path[2] as string,
    );
    const lvl = upgradeEvent.data.stats.explicitData.currentActivePlayerLevel;

    this._logger.verbose('Question data and args', {
      abilityUpgrades,
      upgradeEvent,
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

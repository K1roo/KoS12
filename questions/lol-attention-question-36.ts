/* eslint-disable @typescript-eslint/naming-convention */
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
export class LolAttentionQuestion36 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion36.name,
  );
  public readonly id = 36;
  public readonly title = '';
  // TODO: make dynamic
  private readonly _titleVariants = [
    `Was there more than 10 kills total last game?`,
    `Was there less than 20 kills total last game?`,
    `Was there more than 50 kills last game?`,
  ];
  public readonly titleVars = {};
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.VERY_EASY];
  public readonly appropriateWaveTriggers = [WaveTriggerEvents.GAME_END];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['ChampionKill'];
  private _staticOptions: Record<QuestionDifficulty.VERY_EASY, string[]> = {
    [QuestionDifficulty.VERY_EASY]: ['Yes', 'No'],
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
    const championKills = stats.filter(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName === 'ChampionKill',
    ).length;
    let correctIndex = 0;
    const titleIndex = getRandomInt(0, this._titleVariants.length - 1);
    switch (titleIndex) {
      case 0:
        if (championKills > 10) {
          correctIndex = 0;
        } else {
          correctIndex = 1;
        }
        break;
      case 1:
        if (championKills < 20) {
          correctIndex = 0;
        } else {
          correctIndex = 1;
        }
        break;
      case 2:
        if (championKills > 50) {
          correctIndex = 0;
        } else {
          correctIndex = 1;
        }
        break;
      default:
        break;
    }
    const title = this._titleVariants[titleIndex];
    this._logger.verbose('Question data and args', {
      championKills,
      title,
      correctIndex,
    });
    return {
      id: this.id,
      title,
      titleVars: {},
      options:
        this._staticOptions[difficulty as QuestionDifficulty.VERY_EASY].slice(
          0,
        ),
      optionsVars: null,
      i18n: {title: null, options: null},
      contentType: this.contentType,
      game: SupportedGames.LOL,
      difficulty,
      defaultMinScore: lolAttentionQuestionsDifficultyMap[difficulty].minValue,
      defaultMaxScore: lolAttentionQuestionsDifficultyMap[difficulty].maxValue,
      correctAnswerIndexes: [correctIndex],
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

import { Options } from '@nestjs/common';
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
import {getGameEndEvent} from '../../utils/get-game-end-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

export class LolAttentionQuestion61 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion61.name,
  );

  public readonly id = 61;
  public readonly title = 'Were there any champions dead as the game ended?';
  public readonly titleVars = {};
  public readonly options = ['Yes', 'No'];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };

  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.EASY];
  public readonly appropriateWaveTriggers = [WaveTriggerEvents.GAME_END];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['General'];
  private _staticOptions: any;

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
  ) {
    super();
    this._lolAttentionQuestionsService.registerQuestion(this);
  }

  public readonly isRelevant = (): null => null;

  public readonly build = async (
    stats: NotaryStatsLolMessage[],
    difficulty: QuestionDifficulty,
    _waveConf: WaveSettings,
  ): Promise<StaticQuestion | null> => {
    if (!this.availableDifficulty.includes(difficulty)) {
      this._logger.error(new Error(`Unsupported difficulty: ${difficulty}`));
      return null;
    }
    const gameEndEvent = getGameEndEvent(stats);
    if (
      !gameEndEvent ||
      !gameEndEvent.data.stats.explicitData.allPlayers
    ) 
    {
      this._logger.warn('Not enough data to build the question', {
        gameEndEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    for (const player of extraDataEvent.data.stats.explicitData.allPlayers) {
      if (
            allPlayers.IsDead === 1) {
            correctAnswerIndex = 1;
            break;
           }
            else { correctAnswerIndex = 2;
           };
    return {
      id: this.id,
      title: this.title,
      titleVars: {},
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
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
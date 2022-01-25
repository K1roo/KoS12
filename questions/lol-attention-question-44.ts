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
import {getGameEndEvent} from '../../utils/get-game-end-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion44 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion44.name,
  );
  public readonly id = 44;
  public readonly title =
    'Was {{streamerName}} dead when the game ended last game?';
  public readonly titleVars = {streamerName: 'streamer'};
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
  public readonly correlationTags: LolCorrelationTag[] = ['General'];
  private readonly _staticOptions: Record<
    QuestionDifficulty.VERY_EASY,
    string[]
  > = {
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
    const gameEndEvent = getGameEndEvent(stats);
    if (
      !gameEndEvent ||
      !gameEndEvent.data.stats.explicitData.allPlayers ||
      !gameEndEvent.data.stats.explicitData.allPlayers.length
    ) {
      this._logger.warn('Not enough data to build the question', {
        gameEndEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const streamerName = stats[0].data.summonerName;
    const gameEndStreamerEntity =
      gameEndEvent.data.stats.explicitData.allPlayers.find(
        (player: {summonerName: string}) =>
          player.summonerName === streamerName,
      );
    if (!gameEndStreamerEntity) {
      this._logger.warn('Not enough data to build the question', {
        gameEndEvent,
        difficulty,
        streamerName,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    this._logger.verbose('Question data and args', {
      gameEndEvent,
      streamerName,
      gameEndStreamerEntity,
    });
    let correctAnswerIndex = 1;
    if (gameEndStreamerEntity.isDead) {
      correctAnswerIndex = 0;
    }
    return {
      id: this.id,
      title: this.title,
      titleVars: {streamerName},
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
      correctAnswerIndexes: [correctAnswerIndex],
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

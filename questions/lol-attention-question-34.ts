/* eslint-disable @typescript-eslint/naming-convention */
import {Injectable} from '@nestjs/common';

import {SupportedGames} from '../../../../../../agnostic/supported-games';
import {WinstonLogger} from '../../../../../common/logger/logger.service';
import {RiotGamesApiService} from '../../../../../common/riot-games-api/riot-games-api.service';
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
export class LolAttentionQuestion34 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion34.name,
  );
  public readonly id = 34;
  public readonly title = `Which map did {{streamerName}} play on last game?`;
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
  public readonly availableDifficulty = [QuestionDifficulty.VERY_EASY];
  public readonly appropriateWaveTriggers = [WaveTriggerEvents.GAME_END];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['General'];
  private _staticOptions: Record<QuestionDifficulty.VERY_EASY, string[]> = {
    [QuestionDifficulty.VERY_EASY]: ['Howling Abyss', `Summoner's Rift`],
  };

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
    private readonly _riotGamesApiService: RiotGamesApiService,
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
      !gameEndEvent.data.stats.explicitData.gameData ||
      !gameEndEvent.data.stats.explicitData.gameData.gameTime
    ) {
      this._logger.warn('Not enough data to build the question', {
        gameEndEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    this._logger.verbose('Question data and args', {
      gameEndEvent,
    });
    let correctAnswerIndex: number;
    const options =
      this._staticOptions[difficulty as QuestionDifficulty.VERY_EASY].slice(0);
    const mapId = gameEndEvent.data.stats.explicitData.gameData.mapNumber;
    /**
     * 1, 2, 11 - Summoner's Rift
     * 12 - Howling Abyss
     */
    if ([1, 2, 11].includes(mapId)) {
      correctAnswerIndex = 1;
    } else if (mapId === 12) {
      correctAnswerIndex = 0;
    } else {
      const mapsDescription =
        await this._riotGamesApiService.getLolMapsDescription();
      const mapItem = mapsDescription.find((item) => item.mapId === mapId);
      if (!mapItem) {
        this._logger.warn('Not enough data to build the question', {
          gameEndEvent,
          difficulty,
          mapsDescription,
        });
        this._logger.error('Not enough data to build the question');
        return null;
      }
      options.push(mapItem.mapName);
      correctAnswerIndex = 2;
    }
    return {
      id: this.id,
      title: this.title,
      titleVars: {
        streamerName: stats[0].data.summonerName || this.titleVars.streamerName,
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

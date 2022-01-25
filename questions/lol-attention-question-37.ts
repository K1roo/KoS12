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
import {getRandomInt} from '../../../../../utils/rand-int.util';
import {getGameEndEvent} from '../../utils/get-game-end-event';
import {getGameStartEvent} from '../../utils/get-game-start-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion37 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion37.name,
  );
  public readonly id = 37;
  public readonly title = 'Was {{championName}} played in the last game?';
  public readonly titleVars = {
    championName: '',
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
  private readonly _staticOptions: Record<
    QuestionDifficulty.VERY_EASY,
    string[]
  > = {
    [QuestionDifficulty.VERY_EASY]: ['Yes', 'No'],
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
    const gameEndOrStartEvent =
      getGameEndEvent(stats) || getGameStartEvent(stats);
    if (
      !gameEndOrStartEvent ||
      !gameEndOrStartEvent.data.stats.explicitData.allPlayers ||
      !gameEndOrStartEvent.data.stats.explicitData.allPlayers.length
    ) {
      this._logger.warn('Not enough data to build the question', {
        gameEndOrStartEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const playedChampions: string[] =
      gameEndOrStartEvent.data.stats.explicitData.allPlayers.map(
        (player: {championName: string}) => player.championName,
      );
    let correctAnswerIndexes = getRandomInt(0, 1);
    let championName = '';
    if (correctAnswerIndexes === 0) {
      championName =
        playedChampions[getRandomInt(0, playedChampions.length - 1)];
    } else {
      const allChampionsNames =
        await this._riotGamesApiService.getAllLolChampionsNames();
      const filteredChampionsNames = allChampionsNames.filter(
        (championName) => !playedChampions.includes(championName),
      );
      championName =
        filteredChampionsNames[
          getRandomInt(0, filteredChampionsNames.length - 1)
        ];
    }
    return {
      id: this.id,
      title: this.title,
      titleVars: {championName},
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
      correctAnswerIndexes: [correctAnswerIndexes],
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

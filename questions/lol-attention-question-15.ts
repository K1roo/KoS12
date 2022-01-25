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
import {getGameEndEvent} from '../../utils/get-game-end-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion15 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion15.name,
  );
  public readonly id = 15;
  public readonly title = 'What champion had the most kills last game?';
  public readonly titleVars = {};
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.MEDIUM];
  public readonly appropriateWaveTriggers = [WaveTriggerEvents.GAME_END];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['General'];

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
    const sortedPlayers = (
      gameEndEvent.data.stats.explicitData.allPlayers as {
        summonerName: string;
        championName: string;
        team: string;
        scores: {kills: number; deaths: number};
      }[]
    ).sort((a, b) => b.scores.kills - a.scores.kills);
    sortedPlayers.length = 4;
    const bestKills = sortedPlayers[0].scores.kills;
    const bestChampionNames = sortedPlayers.reduce((acc: string[], player) => {
      if (player.scores.kills === bestKills) acc.push(player.championName);
      return acc;
    }, []);
    const options = shuffleArray(
      sortedPlayers.map((player) => player.championName),
    );
    const correctAnswerIndexes = options.reduce(
      (acc: number[], champName, i) => {
        if (bestChampionNames.includes(champName)) {
          acc.push(i);
        }
        return acc;
      },
      [],
    );
    return {
      id: this.id,
      title: this.title,
      titleVars: this.titleVars,
      options,
      optionsVars: null,
      i18n: {title: null, options: null},
      contentType: this.contentType,
      game: SupportedGames.LOL,
      difficulty,
      defaultMinScore: lolAttentionQuestionsDifficultyMap[difficulty].minValue,
      defaultMaxScore: lolAttentionQuestionsDifficultyMap[difficulty].maxValue,
      correctAnswerIndexes,
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

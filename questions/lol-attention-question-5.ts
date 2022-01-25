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
import {getGameEndEvent} from '../../utils/get-game-end-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion5 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion5.name,
  );
  public readonly id = 5;
  public readonly title =
    'Which champion did {{streamerName}} play in the last game?';
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
    let playedChampion: string | null = null;
    const playedChampions = (
      gameEndEvent.data.stats.explicitData.allPlayers as Array<{
        championName: string;
        summonerName: string;
      }>
    )
      .map((player) => {
        if (gameEndEvent.data.summonerName === player.summonerName) {
          playedChampion = player.championName;
        }
        return player.championName;
      })
      .filter((championName) => typeof championName === 'string');

    if (!playedChampion || playedChampions.length < 4) {
      this._logger.warn('Not enough data to build the question', {
        playedChampion,
        playedChampions,
        gameEndEvent,
        difficulty,
        stats,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    playedChampions.splice(playedChampions.indexOf(playedChampion), 1);
    const correctAnswerIndexes = [getRandomInt(0, 3)];
    const options = new Array(4).fill('').map((_element, index) => {
      if (correctAnswerIndexes.includes(index)) {
        return playedChampion as string;
      } else {
        const [randomPlayedChampion] = playedChampions.splice(
          getRandomInt(0, playedChampions.length - 1),
          1,
        );
        return randomPlayedChampion;
      }
    });
    this._logger.verbose('Question data and args', {
      playedChampion,
      playedChampions,
      difficulty,
      correctAnswerIndexes,
      options,
    });
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
      correctAnswerIndexes,
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

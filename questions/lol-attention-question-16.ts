/* eslint-disable @typescript-eslint/naming-convention */

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
export class LolAttentionQuestion16 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion16.name,
  );
  public readonly id = 16;
  public readonly title = 'What champion has the most kills currently?';
  public readonly titleVars = {};
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.EASY];
  public readonly appropriateWaveTriggers = [WaveTriggerEvents.GAME_CONTINUES];
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
    const gameStartEvent = getGameEndEvent(stats);
    if (
      !gameStartEvent ||
      !gameStartEvent.data.stats.explicitData.allPlayers ||
      !gameStartEvent.data.stats.explicitData.allPlayers.length
    ) {
      this._logger.warn('Not enough data to build the question', {
        gameStartEvent,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const players = (
      gameStartEvent.data.stats.explicitData.allPlayers as Array<{
        summonerName: string;
        championName: string;
      }>
    ).map((player) => ({
      summonerName: player.summonerName,
      championName: player.championName,
      kills: 0,
    }));

    const sortedPlayers = stats
      .filter(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          statEvent.data.stats.val.EventName &&
          statEvent.data.stats.val.EventName === 'ChampionKill',
      )
      .reduce((players, statEvent) => {
        if (
          typeof statEvent.data.stats.val === 'object' &&
          typeof statEvent.data.stats.val.KillerName === 'string'
        ) {
          const playerIndex = players.findIndex(
            (player) =>
              player.summonerName ===
              (statEvent.data.stats.val as {KillerName: string}).KillerName,
          );
          if (playerIndex !== -1) ++players[playerIndex].kills;
        }
        return players;
      }, players)
      .sort((a, b) => b.kills - a.kills);
    sortedPlayers.length = 4;
    const bestKills = players[0].kills;
    const bestChampionNames = sortedPlayers.reduce((acc: string[], player) => {
      if (player.kills === bestKills) acc.push(player.championName);
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
      correctAnswerIndexes: correctAnswerIndexes,
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

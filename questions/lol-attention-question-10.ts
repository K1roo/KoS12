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
import {getGameStartEvent} from '../../utils/get-game-start-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion10 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion10.name,
  );
  public readonly id = 10;
  public readonly title = 'Who was killed first this game?';
  public readonly titleVars = {};
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.EASY];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_START,
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['General'];

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
  ) {
    super();
    this._lolAttentionQuestionsService.registerQuestion(this);
  }

  public readonly isRelevant = (stats: NotaryStatsLolMessage[]): boolean => {
    return stats.some(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        statEvent.data.stats.val.EventName === 'ChampionKill',
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
    const gameStartEvent = getGameStartEvent(stats);
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

    const championsMap = new Map<string, string>(
      gameStartEvent.data.stats.explicitData.allPlayers.map((player: any) => [
        player.summonerName as string,
        player.championName as string,
      ]),
    );
    const killEvents = stats.filter(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        typeof statEvent.data.stats.val.EventTime === 'number' &&
        statEvent.data.stats.val.VictimName &&
        statEvent.data.stats.val.EventName === 'ChampionKill',
    ) as unknown as {
      data: {
        stats: {
          val: {
            EventTime: number;
            VictimName: string;
          };
        };
      };
    }[];
    const victimsNames = [
      ...new Set(
        killEvents
          .sort(
            (a, b) => a.data.stats.val.EventTime - b.data.stats.val.EventTime,
          )
          .map((killEvent) => killEvent.data.stats.val.VictimName),
      ),
    ];
    const [firstVictimName] = victimsNames.splice(0, 1);
    let otherPlayersNames: string[] = [];
    if (victimsNames.length < 3) {
      otherPlayersNames = (
        gameStartEvent.data.stats.explicitData.allPlayers as Array<{
          summonerName: string;
        }>
      )
        .map((player) => player.summonerName)
        .filter(
          (name) =>
            typeof name === 'string' &&
            name !== firstVictimName &&
            !victimsNames.includes(name),
        );
    }
    this._logger.verbose('Question debug data', {
      victimsNames,
      otherPlayersNames,
      firstVictimName,
    });
    const correctAnswerIndex = getRandomInt(0, 3);
    const options = new Array(4)
      .fill('')
      .map((_v, i) => {
        if (i === correctAnswerIndex) {
          return firstVictimName;
        } else {
          const [randomVictimName] = victimsNames.length
            ? victimsNames.splice(getRandomInt(0, victimsNames.length - 1), 1)
            : otherPlayersNames.splice(
                getRandomInt(0, otherPlayersNames.length - 1),
                1,
              );
          return randomVictimName;
        }
      })
      .map((option) =>
        championsMap.has(option)
          ? `${championsMap.get(option)} (${option})`
          : option,
      );
    this._logger.verbose('Question debug data', {
      options,
      correctAnswerIndex,
      victimsNames,
      otherPlayersNames,
      championsMap: [...championsMap.entries()],
    });
    return {
      id: this.id,
      title: this.title,
      titleVars: {},
      options,
      optionsVars: null,
      i18n: {title: null, options: null},
      contentType: this.contentType,
      game: SupportedGames.LOL,
      difficulty,
      defaultMinScore: lolAttentionQuestionsDifficultyMap[difficulty].minValue,
      defaultMaxScore: lolAttentionQuestionsDifficultyMap[difficulty].maxValue,
      correctAnswerIndexes: [correctAnswerIndex],
      type: 'attention-relevant',
      correlationTags: this.correlationTags,
    };
  };
}

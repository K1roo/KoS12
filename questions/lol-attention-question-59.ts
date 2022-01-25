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
import {getGameEndEvent} from '../../utils/get-game-end-event';
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion59 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion59.name,
  );
  public readonly id = 59;
  public readonly title = 'Who got the last kill of the game?';
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
  public readonly correlationTags: LolCorrelationTag[] = ['ChampionKill'];

  public constructor(
    private readonly _lolAttentionQuestionsService: LolAttentionQuestionsService,
  ) {
    super();
    this._lolAttentionQuestionsService.registerQuestion(this);
  }

  public readonly isRelevant = (stats: NotaryStatsLolMessage[]): boolean => {
    return (
      stats.some(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          statEvent.data.stats.val.EventName &&
          statEvent.data.stats.val.EventName === 'ChampionKill',
      ) &&
      stats.some(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          statEvent.data.stats.val.EventName &&
          statEvent.data.stats.val.EventName === 'GameEnd',
      )
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

    const championsMap = new Map<string, string>(
      gameEndEvent.data.stats.explicitData.allPlayers.map((player: any) => [
        player.summonerName as string,
        player.championName as string,
      ]),
    );
    const sortedKillEvents = stats
      .filter(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          statEvent.data.stats.val.EventName &&
          typeof statEvent.data.stats.val.EventTime === 'number' &&
          statEvent.data.stats.val.KillerName &&
          statEvent.data.stats.val.EventName === 'ChampionKill',
      )
      .sort(
        (a, b) =>
          ((b.data.stats.val as Record<string, any>).EventTime as number) -
          ((a.data.stats.val as Record<string, any>).EventTime as number),
      );
    if (!sortedKillEvents.length) {
      this._logger.warn('Not enough data to build the question', {
        sortedKillEvents,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const lastKillEvent = sortedKillEvents[0];
    const otherKillers = [
      ...new Set(
        sortedKillEvents
          .filter(
            (statEvent) =>
              ((statEvent.data.stats.val as Record<string, any>)
                .KillerName as string) !==
              ((lastKillEvent.data.stats.val as Record<string, any>)
                .KillerName as string),
          )
          .map((ev) => (ev.data.stats.val as Record<string, any>).KillerName),
      ),
    ];
    const lastKillerName = (lastKillEvent.data.stats.val as Record<string, any>)
      .KillerName as string;
    let otherPlayersNames: string[] = [];
    if (otherKillers.length < 3) {
      otherPlayersNames = (
        gameEndEvent.data.stats.explicitData.allPlayers as Array<{
          summonerName: string;
        }>
      )
        .map((player) => player.summonerName)
        .filter(
          (name) =>
            typeof name === 'string' &&
            name !== lastKillerName &&
            !otherKillers.includes(name),
        );
    }
    this._logger.verbose('Question debug data', {
      lastKillEvent,
      otherKillers,
      otherPlayersNames,
    });
    const correctAnswerIndex = getRandomInt(0, 3);
    const options = new Array(4)
      .fill('')
      .map((_v, i) => {
        if (i === correctAnswerIndex) {
          return lastKillerName;
        } else {
          const [randomVictimName] = otherKillers.length
            ? otherKillers.splice(getRandomInt(0, otherKillers.length - 1), 1)
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

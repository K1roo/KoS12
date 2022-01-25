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
export class LolAttentionQuestion60 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion60.name,
  );
  public readonly id = 60;
  public readonly title = 'Who last hit the first Rift Herald?';
  public readonly titleVars = {};
  public readonly options = [];
  public readonly optionsVars = [];
  public readonly i18n = {
    title: null,
    options: null,
  };
  public readonly contentType: QuestionContentType = 'text';
  public readonly availableDifficulty = [QuestionDifficulty.DIFFICULT];
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_START,
    WaveTriggerEvents.GAME_CONTINUES,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC];
  public readonly correlationTags: LolCorrelationTag[] = ['HeraldKill'];

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
        statEvent.data.stats.val.EventName === 'HeraldKill',
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
        gameEndEvent: gameStartEvent,
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
    const [firstHeraldKillEvent] = stats
      .filter(
        (statEvent) =>
          typeof statEvent.data.stats.val === 'object' &&
          statEvent.data.stats.val.EventName &&
          typeof statEvent.data.stats.val.EventTime === 'number' &&
          statEvent.data.stats.val.KillerName &&
          statEvent.data.stats.val.EventName === 'HeraldKill',
      )
      .sort(
        (a, b) =>
          ((a.data.stats.val as Record<string, any>).EventTime as number) -
          ((b.data.stats.val as Record<string, any>).EventTime as number),
      );
    if (!firstHeraldKillEvent) {
      this._logger.warn('Not enough data to build the question', {
        firstHeraldKillEvent,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const otherKillers = [
      ...new Set(
        stats
          .filter(
            (statEvent) =>
              typeof statEvent.data.stats.val === 'object' &&
              statEvent.data.stats.val.EventName &&
              typeof statEvent.data.stats.val.EventTime === 'number' &&
              statEvent.data.stats.val.KillerName &&
              statEvent.data.stats.val.KillerName !==
                ((firstHeraldKillEvent.data.stats.val as Record<string, any>)
                  .KillerName as string) &&
              statEvent.data.stats.val.EventName === 'ChampionKill',
          )
          .map((ev) => (ev.data.stats.val as Record<string, any>).KillerName),
      ),
    ];
    const firstHeraldKillerName = (
      firstHeraldKillEvent.data.stats.val as Record<string, any>
    ).KillerName as string;
    let otherPlayersNames: string[] = [];
    if (otherKillers.length < 3) {
      otherPlayersNames = (
        gameStartEvent.data.stats.explicitData.allPlayers as Array<{
          summonerName: string;
        }>
      )
        .map((player) => player.summonerName)
        .filter(
          (name) =>
            typeof name === 'string' &&
            name !== firstHeraldKillerName &&
            !otherKillers.includes(name),
        );
    }
    this._logger.verbose('Question debug data', {
      firstHeraldKillEvent,
      otherKillers,
      otherPlayersNames,
    });
    const correctAnswerIndex = getRandomInt(0, 3);
    const options = new Array(4)
      .fill('')
      .map((_v, i) => {
        if (i === correctAnswerIndex) {
          return firstHeraldKillerName;
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

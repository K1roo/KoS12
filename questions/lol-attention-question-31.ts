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
export class LolAttentionQuestion31 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion31.name,
  );
  public readonly id = 31;
  public readonly title =
    'What primary rune did {{streamerName}} chose this game?';
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
  public readonly appropriateWaveTriggers = [
    WaveTriggerEvents.GAME_START,
    WaveTriggerEvents.GAME_CONTINUES,
    WaveTriggerEvents.GAME_END,
  ];
  public readonly gameModes = [LolGameModes.CLASSIC, LolGameModes.ARAM];
  public readonly correlationTags: LolCorrelationTag[] = ['General'];

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
    const event = getGameEndEvent(stats) || getGameStartEvent(stats);
    if (
      !event ||
      typeof event.data.stats.val !== 'object' ||
      !event.data.stats.explicitData ||
      !event.data.stats.explicitData.activePlayer ||
      !event.data.stats.explicitData.activePlayer.fullRunes ||
      !event.data.stats.explicitData.activePlayer.fullRunes.primaryRuneTree ||
      !event.data.stats.explicitData.activePlayer.fullRunes.primaryRuneTree
        .displayName
    ) {
      this._logger.warn('Not enough data to build the question', {
        gameEndEvent: event,
        difficulty,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const correctAnswerIndex = getRandomInt(0, 3);
    const runesDescription = (
      await this._riotGamesApiService.getLolRunesDescription()
    ).filter(
      (runeDescription) =>
        runeDescription.id !==
        event.data.stats.explicitData.activePlayer.fullRunes.primaryRuneTree.id,
    );
    const options: string[] = new Array(4).fill('').map((_val, i) => {
      if (i === correctAnswerIndex) {
        return event.data.stats.explicitData.activePlayer.fullRunes
          .primaryRuneTree.displayName;
      } else {
        return runesDescription.splice(
          getRandomInt(0, runesDescription.length - 1),
          1,
        )[0].name;
      }
    });
    this._logger.verbose('Question data and args', {
      runesDescription,
      event,
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
      correctAnswerIndexes: [correctAnswerIndex],
      type: 'attention-common',
      correlationTags: this.correlationTags,
    };
  };
}

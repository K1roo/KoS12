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
import {LolAttentionQuestionsService} from '../lol-attention-questions.service';

@Injectable()
export class LolAttentionQuestion40 extends LolAttentionQuestion {
  private _logger: WinstonLogger = new WinstonLogger(
    LolAttentionQuestion40.name,
  );
  public readonly id = 40;
  public readonly title =
    'Was {{streamerName}} the First Blood for the enemy team during the game?';
  public readonly titleVars = {streamerName: 'streamer'};
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
  public readonly correlationTags: LolCorrelationTag[] = ['FirstBlood'];
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

  public readonly isRelevant = (stats: NotaryStatsLolMessage[]): boolean => {
    return stats.some(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        statEvent.data.stats.val.EventName === 'FirstBlood',
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
    const firstBloodEvent = stats.find(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventName &&
        statEvent.data.stats.val.EventName === 'FirstBlood',
    );
    const streamerName = stats[0].data.summonerName;
    if (
      !streamerName ||
      !firstBloodEvent ||
      typeof firstBloodEvent.data.stats.val !== 'object' ||
      !firstBloodEvent.data.stats.val.Recipient ||
      typeof firstBloodEvent.data.stats.val.EventTime !== 'number'
    ) {
      this._logger.warn('Not enough data to build the question', {
        firstBloodEvent,
        difficulty,
        streamerName,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    const appropriateKillEvent = stats.find(
      (statEvent) =>
        typeof statEvent.data.stats.val === 'object' &&
        statEvent.data.stats.val.EventTime ===
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (firstBloodEvent!.data.stats.val! as Record<string, number>)
            .EventTime &&
        statEvent.data.stats.val.EventName === 'ChampionKill',
    );
    if (
      !appropriateKillEvent ||
      typeof appropriateKillEvent.data.stats.val !== 'object' ||
      !appropriateKillEvent.data.stats.val.VictimName
    ) {
      this._logger.warn('Not enough data to build the question', {
        firstBloodEvent,
        difficulty,
        streamerName,
        appropriateKillEvent,
      });
      this._logger.error('Not enough data to build the question');
      return null;
    }
    let correctAnswerIndex = 0;
    if (appropriateKillEvent.data.stats.val.VictimName !== streamerName) {
      correctAnswerIndex = 1;
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
      type: 'attention-relevant',
      correlationTags: this.correlationTags,
    };
  };
}

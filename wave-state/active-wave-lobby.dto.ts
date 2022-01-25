import {asClass} from '../../../common-lib/src/transformer/class/as-class';
import {field} from '../../../common-lib/src/transformer/class/field';
import {asNullable} from '../../../common-lib/src/transformer/nullable/as-nullable';
import {asNumber} from '../../../common-lib/src/transformer/number/as-number';
import {LeaderboardEntryDto} from '../leaderboard/leaderboard-entry.dto';
import {WaveQuestionDto} from '../wave-question/wave-question-dto';

import {AppliedBoostDto} from './applied-boost.dto';
import {KosQuestionId} from './kos-question-id';
import {KosWaveId} from './kos-wave-id';
import {WaveLobby} from './wave-lobby';
import {WaveLobbyId} from './wave-lobby-id';
import {WaveProgressItem} from './wave-progress-item';

export class ActiveWaveLobbyDto extends WaveLobby {
  @field(asNullable(asClass(WaveQuestionDto)))
  public readonly questionState: WaveQuestionDto | null;

  @field(asNumber()) public readonly questionIndex: number;

  @field(asNumber<KosWaveId>()) public readonly waveId: KosWaveId;

  @field(asNumber<KosQuestionId>()) public readonly questionId: KosQuestionId;

  public constructor(
    showAt: Date,
    lobbyId: WaveLobbyId | null,
    progress: readonly WaveProgressItem[],
    score: number,
    questionState: WaveQuestionDto | null,
    questionIndex: number,
    appliedBoosts: ReadonlyMap<number, AppliedBoostDto>,
    boostApplyingLimitation: number,
    waveId: KosWaveId,
    questionId: KosQuestionId,
    leaderboard: LeaderboardEntryDto[] | null,
  ) {
    super(
      showAt,
      lobbyId,
      progress,
      score,
      appliedBoosts,
      boostApplyingLimitation,
      leaderboard,
    );

    this.questionState = questionState;
    this.questionIndex = questionIndex;
    this.waveId = waveId;
    this.questionId = questionId;
  }
}

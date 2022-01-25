import {field} from '../../../common-lib/src/transformer/class/field';
import {asNumber} from '../../../common-lib/src/transformer/number/as-number';
import {LeaderboardEntryDto} from '../leaderboard/leaderboard-entry.dto';

import {AppliedBoostDto} from './applied-boost.dto';
import {WaveLobby} from './wave-lobby';
import {WaveLobbyId} from './wave-lobby-id';
import {WaveProgressItem} from './wave-progress-item';

export class ResultWaveLobbyDto extends WaveLobby {
  @field(asNumber()) public readonly earnedTrophiesAmount: number;

  @field(asNumber())
  public readonly earnedLootsAmount: number;

  public constructor(
    showAt: Date,
    lobbyId: WaveLobbyId | null,
    progress: readonly WaveProgressItem[],
    score: number,
    appliedBoosts: ReadonlyMap<number, AppliedBoostDto>,
    boostApplyingLimitation: number,
    earnedTrophiesAmount: number,
    earnedLootsAmount: number,
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
    this.earnedTrophiesAmount = earnedTrophiesAmount;
    this.earnedLootsAmount = earnedLootsAmount;
  }
}

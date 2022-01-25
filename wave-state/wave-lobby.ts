import {asArray} from '../../../common-lib/src/transformer/array/as-array';
import {asClass} from '../../../common-lib/src/transformer/class/as-class';
import {field} from '../../../common-lib/src/transformer/class/field';
import {asMap} from '../../../common-lib/src/transformer/map/as-map';
import {asNullable} from '../../../common-lib/src/transformer/nullable/as-nullable';
import {asNumber} from '../../../common-lib/src/transformer/number/as-number';
import {asString} from '../../../common-lib/src/transformer/string/as-string';
import {LeaderboardEntryDto} from '../leaderboard/leaderboard-entry.dto';

import {AppliedBoostDto} from './applied-boost.dto';
import {asWaveProgressItemType} from './as-wave-progress-item-type';
import {WaveLobbyId} from './wave-lobby-id';
import {WaveProgressItem} from './wave-progress-item';
import {WaveScreen} from './wave-screen';

export abstract class WaveLobby extends WaveScreen {
  /**
   * `null` if user is spectator
   */
  @field(asNullable(asString<WaveLobbyId>()))
  public readonly lobbyId: WaveLobbyId | null;

  @field(asArray(asWaveProgressItemType()))
  public readonly progress: readonly WaveProgressItem[];

  @field(asNumber()) public readonly score: number;

  @field(asMap(asNumber(), asClass(AppliedBoostDto)))
  public readonly appliedBoosts: ReadonlyMap<number, AppliedBoostDto>;

  @field(asNumber()) public readonly boostApplyingLimitation: number;

  @field(asNullable(asArray(asClass(LeaderboardEntryDto))))
  public readonly leaderboard: LeaderboardEntryDto[] | null;

  protected constructor(
    showAt: Date,
    lobbyId: WaveLobbyId | null,
    progress: readonly WaveProgressItem[],
    score: number,
    appliedBoosts: ReadonlyMap<number, AppliedBoostDto>,
    boostApplyingLimitation: number,
    leaderboard: LeaderboardEntryDto[] | null,
  ) {
    super(showAt);
    this.lobbyId = lobbyId;
    this.progress = progress;
    this.score = score;
    this.appliedBoosts = appliedBoosts;
    this.boostApplyingLimitation = boostApplyingLimitation;
    this.leaderboard = leaderboard;
  }
}

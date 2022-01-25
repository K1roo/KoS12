import {asClass} from '../../../common-lib/src/transformer/class/as-class';
import {field} from '../../../common-lib/src/transformer/class/field';
import {asNullable} from '../../../common-lib/src/transformer/nullable/as-nullable';
import {asNumber} from '../../../common-lib/src/transformer/number/as-number';
import {asShiftedDate} from '../../../common-lib/src/transformer/shifted-date/as-shifted-date';

import {KosCurrentKingDto} from './kos-current-king.dto';
import {KosWaveId} from './kos-wave-id';
import {WaveScreen} from './wave-screen';

export class BeforeWaveDto extends WaveScreen {
  @field(asNullable(asShiftedDate())) public readonly waveStartAt: Date | null;

  @field(asNullable(asClass(KosCurrentKingDto)))
  public readonly currentKing: KosCurrentKingDto | null;
  @field(asNullable(asNumber<KosWaveId>()))
  public readonly waveId: KosWaveId | null;

  public constructor(
    showAt: Date,
    waveStartAt: Date | null,
    currentKing: KosCurrentKingDto | null,
    waveId: KosWaveId | null,
  ) {
    super(showAt);
    this.waveStartAt = waveStartAt;
    this.currentKing = currentKing;
    this.waveId = waveId;
  }
}

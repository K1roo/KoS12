import {field} from '../../../common-lib/src/transformer/class/field';
import {asShiftedDate} from '../../../common-lib/src/transformer/shifted-date/as-shifted-date';

export abstract class WaveScreen {
  @field(asShiftedDate()) public readonly showAt: Date;

  protected constructor(showAt: Date) {
    this.showAt = showAt;
  }
}

import {field} from '../../../common-lib/src/transformer/class/field';
import {asShiftedDate} from '../../../common-lib/src/transformer/shifted-date/as-shifted-date';
import {asString} from '../../../common-lib/src/transformer/string/as-string';
import {KosBoostId} from '../dto/boost/kos-boost-id';

export class AppliedBoostDto {
  @field(asString<KosBoostId>()) public readonly boostId: KosBoostId;

  @field(asShiftedDate()) public readonly appliedAt: Date;

  public constructor(boostId: KosBoostId, appliedAt: Date) {
    this.boostId = boostId;
    this.appliedAt = appliedAt;
  }
}

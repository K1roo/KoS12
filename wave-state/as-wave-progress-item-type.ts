import {asEnum} from '../../../common-lib/src/transformer/enum/as-enum';
import {ValueTransformer} from '../../../common-lib/src/transformer/value-transformer';

import {WaveProgressItem} from './wave-progress-item';

export function asWaveProgressItemType(): ValueTransformer<WaveProgressItem> {
  return asEnum(WaveProgressItem);
}

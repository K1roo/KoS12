import {fallbackEnumValue} from '../../../agnostic/common-lib/src/utils/fallback-enum-value';
import {Environments} from '../../common/types/environments';

import {defConf} from './default';
import {devConf} from './development';
import {localConf} from './local';
//@ts-ignore
import {prodConf} from './production';
//@ts-ignore
import {stagingConf} from './staging';

const env: Environments | 'default' = fallbackEnumValue(
  process.env.NODE_ENV,
  Environments,
  'default',
);

const conf = {
  default: defConf,
  development: devConf,
  local: localConf,
  production: prodConf,
  staging: stagingConf,
};

export default conf[env];

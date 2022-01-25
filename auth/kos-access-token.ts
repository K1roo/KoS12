import {JwtString} from '../../../common-lib/src/type/jwt-string';

import {KosAccessTokenPayload} from './kos-access-token.payload';

export type KosAccessToken = JwtString<KosAccessTokenPayload> & {
  readonly _kosAccessToken: unique symbol;
};

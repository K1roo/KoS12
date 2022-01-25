import {Request} from 'express';

import {KosUserId} from '../../../../../agnostic/kos-lib/src/dto/user/kos-user-id';

export interface PassportRequest extends Request {
  user: {
    id: KosUserId;
  };
}

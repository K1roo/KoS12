import {KosUserId} from '../dto/user/kos-user-id';

export interface KosAccessTokenPayload {
  readonly userId: KosUserId;
  readonly creator: boolean;
  readonly verified: boolean;
}

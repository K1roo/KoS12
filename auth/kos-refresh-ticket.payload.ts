import {KosUserId} from '../dto/user/kos-user-id';

export interface KosRefreshTicketPayload {
  readonly prevUserId: KosUserId;
  readonly newUserId: KosUserId;
}

import {WsConnectionId} from '../../../native/ws-connection-id';
import {KosUserId} from '../dto/user/kos-user-id';
import {KosClientAppId} from '../kos-client-app-id';

export interface KosLoginTicketPayload {
  readonly connectionId: WsConnectionId;
  readonly userId: KosUserId | null;
  readonly originApp: KosClientAppId | null;
  readonly deviceMeta?: unknown;
}

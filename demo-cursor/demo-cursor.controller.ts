import {Controller} from '@nestjs/common';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {RemoteNamespaceType} from '../../../agnostic/reactive-data/remote-namespace-type';
import {ServerCompleteFrameLiteral} from '../../../agnostic/reactive-data/server-complete-frame-literal';
import {ServerNextFrameLiteral} from '../../../agnostic/reactive-data/server-next-frame-literal';
import {RemoteMethod} from '../../kos-ws-server/src/decorators/remote-method.decorator';
import {RemoteNamespace} from '../../kos-ws-server/src/decorators/remote-namespace.decorator';

import {DemoCursorService} from './demo-cursor.service';

@Controller(RemoteNamespaceType.DEMO)
@RemoteNamespace(RemoteNamespaceType.DEMO)
export class DemoCursorController {
  public constructor(private readonly _demoCursorService: DemoCursorService) {}

  @RemoteMethod()
  public async list(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<ServerNextFrameLiteral> {
    return this._demoCursorService.listMembersToTheClient(
      subMessage,
      connectionId,
      userId,
    );
  }

  @RemoteMethod()
  public async update(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId?: KosUserId,
  ): Promise<ServerCompleteFrameLiteral> {
    return this._demoCursorService.setRoomMemberPosition(
      subMessage,
      connectionId,
      userId,
    );
  }
}

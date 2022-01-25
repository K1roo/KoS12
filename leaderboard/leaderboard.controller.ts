import {Controller} from '@nestjs/common';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {ServerFrameType} from '../../../agnostic/reactive-data/server-frame-type';
import {ServerNextFrameLiteral} from '../../../agnostic/reactive-data/server-next-frame-literal';
import {RemoteMethod} from '../../kos-ws-server/src/decorators/remote-method.decorator';
import {RemoteNamespace} from '../../kos-ws-server/src/decorators/remote-namespace.decorator';

import {LeaderboardService} from './leaderboard.service';

@Controller('leaderboard')
@RemoteNamespace('leaderboard')
export class LeaderboardController {
  public constructor(
    private readonly _leaderboardService: LeaderboardService,
  ) {}

  @RemoteMethod({authRequired: true})
  public async getChannelIds(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<ServerNextFrameLiteral> {
    let data = await this._leaderboardService.getChannelIds(
      subMessage,
      connectionId,
      userId,
    );
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: data,
    };
  }

  @RemoteMethod()
  public async getMeta(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<ServerNextFrameLiteral> {
    let data = await this._leaderboardService.getMeta(subMessage);
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: data,
    };
  }

  @RemoteMethod()
  public async getRange(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<ServerNextFrameLiteral> {
    let data = await this._leaderboardService.getRange(subMessage);
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: data,
    };
  }

  @RemoteMethod({authRequired: true})
  public async getByLobbyId(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<ServerNextFrameLiteral> {
    let data = await this._leaderboardService.getByLobbyId(
      subMessage,
      connectionId,
      userId,
    );
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: data,
    };
  }
}

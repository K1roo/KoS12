import {Controller} from '@nestjs/common';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {asKosBoostsApplyParamsDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/apply/as-kos-boosts-apply-params.dto';
import {KosBoostsApplyParamsDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/apply/kos-boosts-apply-params.dto';
import {asKosBoostsGetAllNextDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/get-all/as-kos-boosts-get-all-next.dto';
import {asKosBoostsGetInfoNextDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/get-info/as-kos-boosts-get-info-next.dto';
import {asKosBoostsGetUserBoostNextDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/get-user-boost/as-kos-boosts-get-user-boost-next.dto';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {RemoteNamespaceType} from '../../../agnostic/reactive-data/remote-namespace-type';
import {ServerCompleteFrameLiteral} from '../../../agnostic/reactive-data/server-complete-frame-literal';
import {ServerFrameType} from '../../../agnostic/reactive-data/server-frame-type';
import {ServerNextFrameLiteral} from '../../../agnostic/reactive-data/server-next-frame-literal';
import {RemoteMethod} from '../../kos-ws-server/src/decorators/remote-method.decorator';
import {RemoteNamespace} from '../../kos-ws-server/src/decorators/remote-namespace.decorator';

import {BoostsService} from './boosts.service';

@Controller('boosts')
@RemoteNamespace(RemoteNamespaceType.BOOSTS)
export class BoostsController {
  public constructor(private readonly _boostsService: BoostsService) {}

  @RemoteMethod()
  public async getAll(
    subMessage: ClientSubscribeFrameLiteral,
    _connectionId: WsConnectionId,
  ): Promise<ServerNextFrameLiteral> {
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: asKosBoostsGetAllNextDto().dataToLiteral(
        this._boostsService.getBoostsIds(),
      ),
    };
  }

  @RemoteMethod()
  public async getInfo(
    subMessage: ClientSubscribeFrameLiteral,
    _connectionId: WsConnectionId,
  ): Promise<ServerNextFrameLiteral> {
    const data = await this._boostsService.getBoostInfoForClient(subMessage);
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: asKosBoostsGetInfoNextDto().dataToLiteral(data),
    };
  }

  @RemoteMethod()
  public async getUserBoost(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
  ): Promise<ServerNextFrameLiteral> {
    const data = await this._boostsService.getUserBoostForClient(
      subMessage,
      connectionId,
    );
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: asKosBoostsGetUserBoostNextDto().dataToLiteral(data),
    };
  }

  @RemoteMethod({authRequired: true})
  public async apply(
    subMessage: ClientSubscribeFrameLiteral,
    _connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<ServerCompleteFrameLiteral> {
    const params: KosBoostsApplyParamsDto =
      asKosBoostsApplyParamsDto().literalToData(subMessage.params, ['params']);

    await this._boostsService.applyBoost(subMessage.id, params, userId);
    return {
      id: subMessage.id,
      type: ServerFrameType.COMPLETE,
    };
  }
}

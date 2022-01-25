import {Controller, Get, Param, ParseIntPipe} from '@nestjs/common';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {RemoteNamespaceType} from '../../../agnostic/reactive-data/remote-namespace-type';
import {ServerCompleteFrameLiteral} from '../../../agnostic/reactive-data/server-complete-frame-literal';
import {ServerFrameType} from '../../../agnostic/reactive-data/server-frame-type';
import {ServerNextFrameLiteral} from '../../../agnostic/reactive-data/server-next-frame-literal';
import {RemoteMethod} from '../../kos-ws-server/src/decorators/remote-method.decorator';
import {RemoteNamespace} from '../../kos-ws-server/src/decorators/remote-namespace.decorator';

import {WaveEntity} from './wave.entity';
import {WavesService} from './waves.service';

@Controller('waves')
@RemoteNamespace(RemoteNamespaceType.WAVES)
export class WavesController {
  public constructor(private readonly _wavesService: WavesService) {}

  @Get(':id')
  public getWave(
    @Param('id', ParseIntPipe) waveId: number,
  ): Promise<WaveEntity | null> {
    return this._wavesService.getWaveById(waveId);
  }

  @RemoteMethod({authRequired: true})
  public async currentWave(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<ServerNextFrameLiteral> {
    let data = await this._wavesService.returnActualChannelWaveToClient(
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

  @RemoteMethod({authRequired: true})
  public async selectAnswerIndexes(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<ServerCompleteFrameLiteral> {
    await this._wavesService.processUserAnswer(
      subMessage,
      connectionId,
      userId,
    );
    return {
      id: subMessage.id,
      type: ServerFrameType.COMPLETE,
    };
  }
}

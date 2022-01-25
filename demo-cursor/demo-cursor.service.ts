import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

import {asClass} from '../../../agnostic/common-lib/src/transformer/class/as-class';
import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {asKosDemoListNextDto} from '../../../agnostic/kos-lib/src/endpoint/demo/list/as-kos-demo-list-next-dto';
import {KosDemoListNextDto} from '../../../agnostic/kos-lib/src/endpoint/demo/list/kos-demo-list-next.dto';
import {DemoUpdateParamsDto} from '../../../agnostic/kos-lib/src/endpoint/demo/update/demo-update-params.dto';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {DemoUserItemDto} from '../../../agnostic/reactive-data/dto/demo/demo-user-item.dto';
import {ServerCompleteFrameLiteral} from '../../../agnostic/reactive-data/server-complete-frame-literal';
import {ServerFrameType} from '../../../agnostic/reactive-data/server-frame-type';
import {ServerNextFrameLiteral} from '../../../agnostic/reactive-data/server-next-frame-literal';
import {WinstonLogger} from '../../common/logger/logger.service';
import {RedisClientService} from '../../common/redis/redis-client.service';
import {DEMO_ROOM} from '../../common/redis/redis-storage-keys';
import {
  CREATE_ROOM,
  DEL_CURSOR_DATA,
  DEMO,
} from '../../common/types/event-emitter-keys';
import {SystemEvents} from '../../common/types/ws/system-events';
import redisConfig from '../../kos-config/redis/configuration';
import {WsSubscriptionsService} from '../ws-subscriptions/ws-subscriptions.service';

const clientOptions: ClientOptions = {
  transport: Transport.REDIS,
  options: redisConfig,
};

@Injectable()
export class DemoCursorService {
  private readonly _logger: WinstonLogger = new WinstonLogger(
    DemoCursorService.name,
  );
  private _microserviceClient: ClientProxy;

  public constructor(
    private readonly _redisClientService: RedisClientService,
    private readonly _wsSubscriptionsService: WsSubscriptionsService,
  ) {
    this._microserviceClient = ClientProxyFactory.create(clientOptions);
  }

  @OnEvent(`${DEMO}.${DEL_CURSOR_DATA}`)
  public async delCursorData(
    connectionId: WsConnectionId,
    leftSubsAmount?: number,
  ): Promise<void> {
    const {redisClient} = this._redisClientService;
    await redisClient.hdel(DEMO_ROOM, connectionId);
    await this._publishUpdateTrigger(connectionId);
    if (leftSubsAmount === 0) {
      this.deleteRoom();
    }
  }

  private async _createDemoRoomAndSetTtl(): Promise<void> {
    const {redisClient} = this._redisClientService;
    const currentKeys = await redisClient.hkeys(DEMO_ROOM);
    if (currentKeys.length > 0) {
      await redisClient.hdel(DEMO_ROOM, currentKeys);
    }
    await redisClient.hset(DEMO_ROOM, 'createdAt', new Date().toISOString());

    const keys = await redisClient.hkeys(DEMO_ROOM);
    this._logger.debug('Room created', {keys});
  }

  private async _emptyDemoRoom(): Promise<void> {
    const {redisClient} = this._redisClientService;
    const currentKeys = await redisClient.hkeys(DEMO_ROOM);
    if (currentKeys.length > 0) {
      await redisClient.hdel(DEMO_ROOM, currentKeys);
    }

    const keys = await redisClient.hkeys(DEMO_ROOM);
    this._logger.debug('Room deleted', {keys});
  }

  @OnEvent(`${DEMO}.${CREATE_ROOM}`)
  public async createRoom(): Promise<void> {
    await this._createDemoRoomAndSetTtl();
  }

  public async deleteRoom(): Promise<void> {
    await this._emptyDemoRoom();
  }

  public async getRoomMembersCursorPosition(
    connectionToExclude?: WsConnectionId,
  ): Promise<KosDemoListNextDto> {
    const {redisClient} = this._redisClientService;
    const res = await redisClient.hgetall(DEMO_ROOM);
    const dataToReturn = [];
    for (const [key, data] of Object.entries(res)) {
      if (key !== 'createdAt') {
        const coordinates = asClass(DemoUserItemDto).literalToData(
          JSON.parse(data),
          [],
        );
        if (connectionToExclude === undefined || connectionToExclude !== key) {
          dataToReturn.push(coordinates);
        }
      }
    }
    this._logger.debug('Room members received', {dataToReturn});
    return dataToReturn;
  }

  public async listMembersToTheClient(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<ServerNextFrameLiteral> {
    await this._wsSubscriptionsService.setSubscription({
      connectionId: connectionId,
      userId,
      passedId: subMessage.id,
      namespace: subMessage.namespace,
      params: subMessage.params as Record<string, string>,
    });
    const memberPositions = await this.getRoomMembersCursorPosition(
      connectionId,
    );
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: asKosDemoListNextDto().dataToLiteral(memberPositions),
    };
  }

  private async _publishUpdateTrigger(
    connectionId: WsConnectionId,
  ): Promise<void> {
    this._microserviceClient.emit<
      SystemEvents.DEMO_CURSOR_UPDATE_TRIGGER,
      WsConnectionId
    >(SystemEvents.DEMO_CURSOR_UPDATE_TRIGGER, connectionId);
  }

  public async setRoomMemberPosition(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
    userId?: KosUserId,
  ): Promise<ServerCompleteFrameLiteral> {
    this._logger.debug('setRoomMemberPosition', {
      subMessage,
      connectionId,
      userId,
    });
    const {redisClient} = this._redisClientService;
    const res = await redisClient.hgetall(DEMO_ROOM);
    if (!res.createdAt) {
      return {
        id: subMessage.id,
        type: ServerFrameType.COMPLETE,
      };
    }
    const params = asClass(DemoUpdateParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );
    await redisClient.hset(
      DEMO_ROOM,
      connectionId,
      JSON.stringify(asClass(DemoUpdateParamsDto).dataToLiteral(params)),
    );
    await this._publishUpdateTrigger(connectionId);
    return {
      id: subMessage.id,
      type: ServerFrameType.COMPLETE,
    };
  }
}

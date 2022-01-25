import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {InjectRepository} from '@nestjs/typeorm';
import {LessThanOrEqual} from 'typeorm';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {KosClientAppId} from '../../../agnostic/kos-lib/src/kos-client-app-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {WinstonLogger} from '../../common/logger/logger.service';
import {
  KOS_CHANNEL,
  SESSION_FINISHED,
  UPDATE_LAST_ACTION_AT,
} from '../../common/types/event-emitter-keys';
import wsServerConfig from '../../kos-config/ws-server/configuration';
import {WsConnectionService} from '../ws-connections/ws-connections.service';

import {ChannelSessionRepository} from './channel-session.repository';

@Injectable()
export class ChannelSessionService {
  private readonly _logger = new WinstonLogger(ChannelSessionService.name);
  public constructor(
    @InjectRepository(ChannelSessionRepository)
    private _channelSessionRepository: ChannelSessionRepository,
    private _wsConnectionService: WsConnectionService,
  ) {}

  public async startUserChannelSession(
    connectionId: WsConnectionId,
    channelId: string,
    userId: KosUserId,
    appId: KosClientAppId = 'kos-twitch',
  ): Promise<void> {
    try {
      this._wsConnectionService.setConnectionUserData(
        connectionId,
        userId,
        channelId,
        appId,
      );
      const upsertRes =
        await this._channelSessionRepository.upsertLastChannelSession(
          connectionId,
          userId,
          channelId,
          appId,
          new Date(),
        );
      this._logger.debug('User channel session started', {
        upsertRes,
      });
    } catch (error) {
      this._logger.error(error);
    }
  }

  @OnEvent(`${KOS_CHANNEL}.${SESSION_FINISHED}`)
  public async removeUserChannelSession(
    connectionId: WsConnectionId,
    userId: KosUserId,
    channelId: string,
  ): Promise<void> {
    this._wsConnectionService.unsetConnectionUserData(
      connectionId,
      channelId,
      userId,
    );
    const delRes = await this._channelSessionRepository.delete({
      connectionId,
      channelId,
      userId,
    });
    this._logger.debug('User channel session finished', {
      connectionId,
      delRes,
    });
    /**
     * TODO: develop fallback mechanic which will remove outdated sessions
     * in the case if event was not emitted in some reason
     */
  }

  public async getKosChannelUniqueUsers(
    channelId: string,
  ): Promise<{userId: KosUserId; level: number}[]> {
    return this._channelSessionRepository.getChannelUniqueUsersLevels(
      channelId,
    );
  }

  public async getUserChannelSessionsAmount(
    userId: KosUserId,
    channelId: string,
  ): Promise<number> {
    return this._channelSessionRepository.count({channelId, userId});
  }

  @OnEvent(`${KOS_CHANNEL}.${UPDATE_LAST_ACTION_AT}`)
  public async updateLastActionAt(
    connectionId: WsConnectionId,
    userId: KosUserId,
    channelId: string,
    appId: KosClientAppId = 'kos-twitch',
  ): Promise<void> {
    const upsertRes =
      await this._channelSessionRepository.upsertLastChannelSession(
        connectionId,
        userId,
        channelId,
        appId,
        new Date(),
      );
    this._logger.debug('Channel session lastActionAt updated', {upsertRes});
  }

  public async deleteOutdated(): Promise<void> {
    const deleteRes = await this._channelSessionRepository.delete({
      lastActionAt: LessThanOrEqual(
        new Date(Date.now() - wsServerConfig.pingClientInterval * 1.5),
      ),
    });
    if (deleteRes.affected) {
      this._logger.log('Outdated channel sessions deleted', {deleteRes});
    }
  }
}

import {EntityRepository, Repository} from 'typeorm';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {KosClientAppId} from '../../../agnostic/kos-lib/src/kos-client-app-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {WinstonLogger} from '../../common/logger/logger.service';

import {ChannelSessionEntity} from './channel-session.entity';

@EntityRepository(ChannelSessionEntity)
export class ChannelSessionRepository extends Repository<ChannelSessionEntity> {
  public _logger: WinstonLogger;
  public constructor() {
    super();
    this._logger = new WinstonLogger(ChannelSessionRepository.name);
  }

  public async getChannelUniqueUsersLevels(
    channelId: string,
  ): Promise<{userId: KosUserId; level: number}[]> {
    return this.createQueryBuilder('channel_session')
      .select('channel_session.user_id', 'userId')
      .distinct(true)
      .addSelect('user.id', 'userId')
      .addSelect('user.level', 'level')
      .leftJoin('channel_session.user', 'user')
      .where({channelId})
      .orderBy('user.level', 'DESC')
      .getRawMany();
  }

  public async upsertLastChannelSession(
    connectionId: WsConnectionId,
    userId: KosUserId,
    channelId: string,
    appId: KosClientAppId,
    lastActionAt: Date,
  ): Promise<void> {
    const upsertRes = await this.createQueryBuilder('channel_sessions')
      .insert()
      .into(ChannelSessionEntity)
      .values({connectionId, userId, channelId, appId, lastActionAt})
      .onConflict(
        '(connection_id) DO UPDATE SET last_action_at = :lastActionAt, user_id = :userId, created_at = CASE WHEN "channel_sessions"."user_id" = :userId THEN "channel_sessions"."created_at" ELSE :createdAt END',
      )
      .setParameter('lastActionAt', lastActionAt)
      .setParameter('userId', userId)
      .setParameter('createdAt', new Date())
      .execute();
    this._logger.debug('Channel session upsert res', {upsertRes});
  }
}

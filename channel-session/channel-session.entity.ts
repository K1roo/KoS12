import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {KosClientAppId} from '../../../agnostic/kos-lib/src/kos-client-app-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {UserEntity} from '../users/user.entity';

@Entity({name: 'channel_sessions'})
@Index(['channelId', 'userId'])
@Index(['connectionId', 'channelId', 'userId'])
export class ChannelSessionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id!: number;

  @Column({name: 'app_id', type: 'varchar', nullable: false})
  public appId!: KosClientAppId;

  // TODO: define relations, discuss denormalization
  @Index()
  @Column({name: 'channel_id', type: 'varchar', nullable: false})
  public channelId!: string;

  @ManyToOne(() => UserEntity, (user) => user.id)
  @JoinColumn({name: 'user_id'})
  public user!: UserEntity;

  @Column({name: 'user_id'})
  public userId!: KosUserId;

  @Column({
    name: 'connection_id',
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  public connectionId!: WsConnectionId;

  @Index()
  @Column({
    name: 'last_action_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  public lastActionAt!: Date;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  public createdAt!: Date;
}

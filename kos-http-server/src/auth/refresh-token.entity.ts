import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import {KosRefreshToken} from '../../../../agnostic/kos-lib/src/data/jwt/kos-refresh-token';
import {KosUserId} from '../../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {UserEntity} from '../../../business/users/user.entity';

@Entity({name: 'refresh_tokens'})
export class RefreshTokenEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column({name: 'refresh_token'})
  public token!: KosRefreshToken;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  public createdAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.id)
  @JoinColumn({name: 'user_id'})
  public user!: UserEntity;

  @Column({name: 'user_id'})
  public userId!: KosUserId;
}

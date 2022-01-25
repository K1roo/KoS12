import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import {KosUserId} from '../../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {UserEntity} from '../../../business/users/user.entity';

@Entity({name: 'otps'})
export class OtpEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column()
  public email!: string;

  @Column()
  public code!: string;

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

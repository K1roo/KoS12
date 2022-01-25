import {
  BaseEntity,
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {KosBoostId} from '../../../agnostic/kos-lib/src/dto/boost/kos-boost-id';
import {KosUserBoostId} from '../../../agnostic/kos-lib/src/dto/boost/kos-user-boost-id';
import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {UserEntity} from '../users/user.entity';

@Entity({name: 'user_boosts'})
@Index(['userId', 'boostId'], {unique: true})
export class UserBoostEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: KosUserBoostId;

  @ManyToOne(() => UserEntity, (user) => user.id)
  @JoinColumn({name: 'user_id'})
  public user!: UserEntity;

  @Column({name: 'user_id'})
  public userId!: KosUserId;

  @Column()
  @Check('(amount >= 0)')
  public amount!: number;

  @Column({name: 'boost_id'})
  public boostId!: KosBoostId;
}

import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WaveLobbyId} from '../../../agnostic/kos-lib/src/wave-state/wave-lobby-id';
import {OneOfWavePlayerActionData} from '../../common/types/db-entities/wave-player-action/one-of-wave-player-action-data';
import {WavePlayerAction} from '../../common/types/db-entities/wave-player-action/wave-player-action';
import {LobbyEntity} from '../lobby/lobby.entity';
import {UserEntity} from '../users/user.entity';
import {WaveEntity} from '../waves/wave.entity';

@Entity({name: 'wave_player_actions'})
export class WavePlayerActionEntity
  extends BaseEntity
  implements WavePlayerAction
{
  @PrimaryGeneratedColumn()
  public id!: number;

  @ManyToOne(() => WaveEntity, (wave) => wave.id)
  @JoinColumn({name: 'wave_id'})
  public wave!: WaveEntity;

  @Column({name: 'wave_id'})
  public waveId!: number;

  @ManyToOne(() => LobbyEntity, (lobby) => lobby.id)
  @JoinColumn({name: 'lobby_id'})
  public lobby!: LobbyEntity;

  @Column({name: 'lobby_id'})
  public lobbyId!: WaveLobbyId;

  @ManyToOne(() => UserEntity, (user) => user.id)
  @JoinColumn({name: 'user_id'})
  public user!: UserEntity;

  @Column({name: 'user_id'})
  public userId!: KosUserId;

  // TODO: define relations, discuss denormalization
  @Column({name: 'channel_id', type: 'varchar', nullable: false})
  public channelId!: string;

  @Column({name: 'action_type', type: 'varchar', nullable: false})
  public actionType!: 'answer' | 'boost';

  @Column({name: 'emitted_at', type: 'timestamp', nullable: false})
  public emittedAt!: Date;

  @Column({name: 'data', type: 'jsonb', nullable: false})
  public data!: OneOfWavePlayerActionData;

  @Column({name: 'stars_distributed', type: 'int', nullable: true})
  public starsDistributed!: number | null;

  @Column({name: 'won', type: 'boolean', default: false})
  public won!: boolean;

  @Column({name: 'wave_question_id', type: 'int', nullable: true})
  public waveQuestionId!: number;
}

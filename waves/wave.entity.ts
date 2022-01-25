import {
  BaseEntity,
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {KosWaveId} from '../../../agnostic/kos-lib/src/wave-state/kos-wave-id';
import {WaveLobbyId} from '../../../agnostic/kos-lib/src/wave-state/wave-lobby-id';
import {SupportedGames} from '../../../agnostic/supported-games';
import {Lobby} from '../../common/types/db-entities/lobby/lobby';
import {WaveQuestion} from '../../common/types/db-entities/wave-question/wave-question';
import {Wave} from '../../common/types/db-entities/wave/wave';
import {WaveStatus} from '../../common/types/db-entities/wave/wave-status';
import {WaveTriggerEvents} from '../../common/types/services-communication/bull/kos-enabler-jobs-arguments/wave-trigger-event';
import {LobbyEntity} from '../lobby/lobby.entity';

import {WaveQuestionEntity} from './wave-question.entity';

@Entity({name: 'waves'})
@Index('channel_id', ['channelId'], {unique: false})
export class WaveEntity extends BaseEntity implements Wave {
  @PrimaryGeneratedColumn()
  public id!: KosWaveId;

  @Column({
    name: 'status',
    type: 'varchar',
    default: 'awaiting',
  })
  public status!: WaveStatus;

  // TODO: define relations
  @Column({name: 'channel_id', type: 'varchar', nullable: false})
  public channelId!: string;

  @Column({name: 'reason', type: 'varchar', nullable: false})
  public reason!: WaveTriggerEvents;

  @Column({name: 'game', type: 'varchar', default: SupportedGames.LOL})
  public game!: SupportedGames;

  @Column({name: 'questions_amount', type: 'int', default: 0})
  public questionsAmount!: number;

  @OneToMany(() => LobbyEntity, (lobby) => lobby.wave)
  public lobbies!: Lobby[];

  @OneToMany(() => WaveQuestionEntity, (waveQuestion) => waveQuestion.wave)
  public questions!: WaveQuestion[];

  @Column({name: 'start_at', type: 'timestamp', nullable: true})
  public startAt!: Date;

  @Column({name: 'resolve_at', type: 'timestamp', nullable: true})
  public resolveAt!: Date | null;

  @Column({name: 'show_resolve_at', type: 'timestamp', nullable: true})
  public showResolveAt!: Date | null;

  @Column({name: 'finish_at', type: 'timestamp', nullable: true})
  public finishAt!: Date | null;

  @Column({
    name: 'previous_finished_at',
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  public previousFinishedAt!: Date;

  @Column({name: 'zero_lobby_id', type: 'uuid'})
  public zeroLobbyId!: WaveLobbyId;

  // @OneToMany(() => WavePlayerActionEntity, (playerAction) => playerAction.wave)
  // public playerActions!: WavePlayerActionEntity[];
}

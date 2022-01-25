import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {KosQuestionId} from '../../../agnostic/kos-lib/src/wave-state/kos-question-id';
import {WaveQuestion} from '../../common/types/db-entities/wave-question/wave-question';
import {StaticQuestion} from '../../common/types/question-library/static-question';

import {WaveEntity} from './wave.entity';

@Entity({name: 'wave_questions'})
@Index(['waveId'], {unique: false})
export class WaveQuestionEntity extends BaseEntity implements WaveQuestion {
  @PrimaryGeneratedColumn()
  public id!: KosQuestionId;

  @Column({
    name: 'question',
    type: 'json',
    nullable: false,
  })
  public question!: StaticQuestion;

  @ManyToOne(() => WaveEntity, (wave) => wave.id)
  @JoinColumn({name: 'wave_id'})
  public wave!: WaveEntity;

  @Column({name: 'wave_id'})
  public waveId!: number;

  @Column({
    name: 'title_vars',
    type: 'json',
    nullable: true,
  })
  public titleVars!: Record<string, string> | null;

  @Column({
    name: 'options_vars',
    type: 'json',
    nullable: true,
  })
  public optionsVars!: Record<string, string>[] | null;

  @Column({
    name: 'question_index',
    type: 'int',
    nullable: false,
  })
  public questionIndex!: number;

  @Column({
    name: 'show_at',
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  public showAt!: Date;

  @Column({name: 'start_at', type: 'timestamp', nullable: false})
  public startAt!: Date;

  @Column({
    name: 'finish_at',
    type: 'timestamp',
    // makes nullable in db in case if 'future' questions will be developed
    nullable: true,
  })
  public finishAt!: Date;

  @Column({
    name: 'min_score',
    type: 'int',
    nullable: false,
    default: 0,
  })
  public minScore!: number;

  @Column({
    name: 'max_score',
    type: 'int',
    nullable: false,
    default: 350,
  })
  public maxScore!: number;

  @Column({
    name: 'correct_answer_indexes',
    type: 'int',
    array: true,
    // makes nullable in db in case if 'future' questions will be developed
    nullable: true,
  })
  public correctAnswerIndexes!: number[];
}

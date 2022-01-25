import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class GameEvent extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: number;

  @Column({name: 'type'})
  public type!: string;

  @Column({type: 'json'})
  public data!: object;
}

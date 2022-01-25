import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

import {KosLootId} from '../../../agnostic/kos-lib/src/dto/loot/kos-loot-id';
import {Currencies} from '../../../agnostic/kos-lib/src/shop/currencies';
import {ShopItemId} from '../../../agnostic/kos-lib/src/shop/shop-item-id';
import {ShopItemTypes} from '../../../agnostic/kos-lib/src/shop/shop-item-types';

@Entity({name: 'shop_items'})
export class ShopItemEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id!: ShopItemId;

  @Column()
  public type!: ShopItemTypes;

  @Column()
  public name!: string;

  @Column()
  public description!: string;

  @Column({name: 'gems_to_credit', nullable: true, type: 'int'})
  public gemsToCredit!: number | null; // relevant for 'credit' type only

  @Column({name: 'loot_id', nullable: true, type: 'varchar'})
  public lootId!: KosLootId | null; // relevant for 'chest' type only

  @Column({type: 'varchar', array: true})
  public pictures!: string[];

  @Column()
  public price!: number;

  @Column()
  public currency!: Currencies;
}

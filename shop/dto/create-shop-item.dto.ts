import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
} from 'class-validator';

import {KosLootId} from '../../../../agnostic/kos-lib/src/dto/loot/kos-loot-id';
import {Currencies} from '../../../../agnostic/kos-lib/src/shop/currencies';
import {ShopItemTypes} from '../../../../agnostic/kos-lib/src/shop/shop-item-types';

export class CreateShopItemDto {
  @IsNotEmpty()
  @IsString()
  public type!: ShopItemTypes;

  @IsNotEmpty()
  @IsString()
  public name!: string;

  @IsNotEmpty()
  @IsString()
  public description!: string;

  @IsOptional()
  @IsNumber()
  public gemsToCredit?: number;

  @IsOptional()
  @IsString()
  public lootId?: KosLootId;

  @IsArray()
  @IsString({each: true})
  public pictures!: string[];

  @IsNotEmpty()
  @IsNumber()
  public price!: number;

  @IsNotEmpty()
  @IsString()
  public currency!: Currencies;
}

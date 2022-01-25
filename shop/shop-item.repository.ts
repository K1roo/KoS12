import {EntityRepository, Repository} from 'typeorm';

import {ShopItemId} from '../../../agnostic/kos-lib/src/shop/shop-item-id';
import {WinstonLogger} from '../../common/logger/logger.service';

import {CreateShopItemDto} from './dto/create-shop-item.dto';
import {ShopItemEntity} from './shop-item.entity';

@EntityRepository(ShopItemEntity)
export class ShopItemRepository extends Repository<ShopItemEntity> {
  private _logger: WinstonLogger;
  public constructor() {
    super();
    this._logger = new WinstonLogger('ShopItemRepository');
  }

  public async createShopItem(
    shopItemData: CreateShopItemDto,
  ): Promise<ShopItemEntity> {
    const {type, name, description, gemsToCredit, pictures, price, currency} =
      shopItemData;
    const shopItem = new ShopItemEntity();

    shopItem.type = type;
    shopItem.name = name;
    shopItem.description = description;
    if (gemsToCredit !== undefined) {
      shopItem.gemsToCredit = gemsToCredit;
    }
    shopItem.pictures = pictures;
    shopItem.price = price;
    shopItem.currency = currency;

    const createdShopItem = await shopItem.save();
    this._logger.verbose('New shop item created', {
      createdShopItem,
      shopItemData,
    });
    return createdShopItem;
  }

  public async getShopItems(): Promise<ShopItemEntity[]> {
    const shopItems = await this.find({});
    this._logger.verbose('Got shop items', {shopItems});
    return shopItems;
  }

  public async getShopItemById(
    id: ShopItemId,
  ): Promise<ShopItemEntity | undefined> {
    const shopItem = await this.findOne(id);
    this._logger.verbose('Got shop item by id', {shopItem, id});
    return shopItem;
  }
}

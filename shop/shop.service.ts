import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';

import {RawDynamicTextDto} from '../../../agnostic/common-lib/src/dynamic-text/raw-dynamic-text.dto';
import {asArray} from '../../../agnostic/common-lib/src/transformer/array/as-array';
import {asClass} from '../../../agnostic/common-lib/src/transformer/class/as-class';
import {ShopGetFiatSectionNextDto} from '../../../agnostic/kos-lib/src/endpoint/shop/shop-get-fiat-section-next.dto';
import {GetShopItemParamsDto} from '../../../agnostic/kos-lib/src/shop/get-shop-item-params.dto';
import {ShopItemId} from '../../../agnostic/kos-lib/src/shop/shop-item-id';
import {ShopItemSectionDto} from '../../../agnostic/kos-lib/src/shop/shop-item-section.dto';
import {ShopItemTypes} from '../../../agnostic/kos-lib/src/shop/shop-item-types';
import {ShopItemDto} from '../../../agnostic/kos-lib/src/shop/shop-item.dto';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {WsServerError} from '../../kos-ws-server/src/ws/ws-server-error.class';
import {LootsService} from '../loots/loots.service';

import {CreateShopItemDto} from './dto/create-shop-item.dto';
import {ShopItemEntity} from './shop-item.entity';
import {ShopItemRepository} from './shop-item.repository';

@Injectable()
export class ShopService {
  public constructor(
    @InjectRepository(ShopItemRepository)
    private _shopItemRepository: ShopItemRepository,
    private _lootsService: LootsService,
  ) {}

  public async createShopItem(
    shopItemData: CreateShopItemDto,
  ): Promise<ShopItemEntity> {
    // if type is credit, gemsToCredit is required
    if (
      shopItemData.type === ShopItemTypes.CREDIT &&
      !shopItemData.gemsToCredit
    ) {
      throw new HttpException(
        'gemsToCredit must be provided for a shop item of the credit type',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (shopItemData.type === ShopItemTypes.CHEST) {
      if (!shopItemData.lootId) {
        throw new HttpException(
          'lootId must be provided for a shop item of the chest type',
          HttpStatus.BAD_REQUEST,
        );
      }
      const lootsIds = this._lootsService.getLootsIds();
      if (!lootsIds.includes(shopItemData.lootId)) {
        throw new HttpException(
          `lootId is not one of ${lootsIds.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    // TODO: add validation for type and currency (CREDIT with USD, CHEST with GEM...)
    return await this._shopItemRepository.createShopItem(shopItemData);
  }

  public async getShopSections(): Promise<unknown> {
    const shopItems = await this._shopItemRepository.getShopItems();

    const shopSections = [];

    const chestSection = new ShopItemSectionDto(
      new RawDynamicTextDto('Chests'),
      shopItems
        .filter((item) => item.type === ShopItemTypes.CHEST)
        .map((item) => item.id as ShopItemId),
    );
    if (chestSection.items.length) {
      shopSections.push(chestSection);
    }

    /**
     * does not show credit section in the shop
     */
    // const creditsSection = new ShopItemSectionDto(
    //   new RawDynamicTextDto('Credits'),
    //   shopItems
    //     .filter((item) => item.type === ShopItemTypes.CREDIT)
    //     .map((item) => item.id as ShopItemId),
    // );
    // if (creditsSection.items.length) {
    //   shopSections.push(creditsSection);
    // }

    return asArray(asClass(ShopItemSectionDto)).dataToLiteral(shopSections);
  }

  public async getFiatSection(): Promise<unknown> {
    const shopItems = await this._shopItemRepository.getShopItems();

    const creditsSection = new ShopGetFiatSectionNextDto(
      shopItems
        .filter((item) => item.type === ShopItemTypes.CREDIT)
        .map((item) => item.id as ShopItemId),
    );

    return asClass(ShopGetFiatSectionNextDto).dataToLiteral(creditsSection);
  }

  public async getShopItem(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<unknown> {
    const params = asClass(GetShopItemParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );
    const shopItemEntity = await this._shopItemRepository.getShopItemById(
      params.id,
    );

    if (!shopItemEntity) {
      throw new WsServerError(subMessage.id, 'Shop item does not exist');
    }

    const shopItem = new ShopItemDto(
      shopItemEntity.id,
      shopItemEntity.type,
      new RawDynamicTextDto(shopItemEntity.name),
      new RawDynamicTextDto(shopItemEntity.description),
      shopItemEntity.pictures,
      shopItemEntity.price,
      shopItemEntity.currency,
    );

    return asClass(ShopItemDto).dataToLiteral(shopItem);
  }

  public getShopItemById(
    shopItemId: ShopItemId,
  ): Promise<ShopItemEntity | undefined> {
    return this._shopItemRepository.getShopItemById(shopItemId);
  }
}

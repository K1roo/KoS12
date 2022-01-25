import {Controller, Post, Body, ValidationPipe} from '@nestjs/common';

import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {ServerFrameType} from '../../../agnostic/reactive-data/server-frame-type';
import {ServerNextFrameLiteral} from '../../../agnostic/reactive-data/server-next-frame-literal';
import {RemoteMethod} from '../../kos-ws-server/src/decorators/remote-method.decorator';
import {RemoteNamespace} from '../../kos-ws-server/src/decorators/remote-namespace.decorator';

import {CreateShopItemDto} from './dto/create-shop-item.dto';
import {ShopItemEntity} from './shop-item.entity';
import {ShopService} from './shop.service';

@Controller('shop')
@RemoteNamespace('shop')
export class ShopController {
  public constructor(private readonly _shopService: ShopService) {}

  @Post('items')
  public createShopItem(
    @Body(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true}))
    shopItemData: CreateShopItemDto,
  ): Promise<ShopItemEntity> {
    return this._shopService.createShopItem(shopItemData);
  }

  @RemoteMethod()
  public async getShopSections(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<ServerNextFrameLiteral> {
    let data = await this._shopService.getShopSections();
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: data,
    };
  }

  @RemoteMethod()
  public async getFiatSection(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<ServerNextFrameLiteral> {
    let data = await this._shopService.getFiatSection();
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: data,
    };
  }

  @RemoteMethod()
  public async getShopItem(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<ServerNextFrameLiteral> {
    let data = await this._shopService.getShopItem(subMessage);
    return {
      id: subMessage.id,
      type: ServerFrameType.NEXT,
      next: data,
    };
  }
}

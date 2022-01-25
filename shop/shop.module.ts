import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';

import {LootsModule} from '../loots/loots.module';

// import {WsConnectionsModule} from '../ws-connections/ws-connections.module';
// import {WsSubscriptionsModule} from '../ws-subscriptions/ws-subscriptions.module';
import {ShopItemRepository} from './shop-item.repository';
import {ShopController} from './shop.controller';
import {ShopService} from './shop.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShopItemRepository]), LootsModule],
  providers: [ShopService],
  controllers: [ShopController],
  exports: [ShopService],
})
export class ShopModule {}

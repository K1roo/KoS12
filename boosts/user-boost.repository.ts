import {EntityRepository, InsertResult, Repository} from 'typeorm';

import {KosBoostId} from '../../../agnostic/kos-lib/src/dto/boost/kos-boost-id';
import {KosUserBoostId} from '../../../agnostic/kos-lib/src/dto/boost/kos-user-boost-id';
import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {WinstonLogger} from '../../common/logger/logger.service';
import {UpsertBoostsResult} from '../../common/types/kos-boosts/upsert-boosts-result';
import {UpsertBoostsValues} from '../../common/types/kos-boosts/upsert-boosts-values';

import {UserBoostEntity} from './user-boost.entity';

@EntityRepository(UserBoostEntity)
export class UserBoostRepository extends Repository<UserBoostEntity> {
  public readonly _logger = new WinstonLogger(UserBoostRepository.name);
  public constructor() {
    super();
  }

  public async updateUserBoostAmount(
    values: UpsertBoostsValues | UpsertBoostsValues[],
  ): Promise<UpsertBoostsResult[]> {
    const insertRes = await this.createQueryBuilder('user_boosts')
      .insert()
      .into(UserBoostEntity)
      .values(values)
      .onConflict(
        '(user_id, boost_id) DO UPDATE SET amount = "user_boosts"."amount" + EXCLUDED.amount',
      )
      .returning(['id', 'userId', 'boostId', 'amount'])
      .execute();
    this._logger.debug('updateUserBoostAmount result', {insertRes});
    return insertRes.raw.map((rawRes: any) => ({
      id: rawRes.id,
      userId: rawRes.user_id,
      boostId: rawRes.boost_id,
      amount: rawRes.amount,
    }));
  }

  public async setUserBoostAmount(
    userId: KosUserId,
    boostId: KosBoostId,
    amount: number,
  ): Promise<InsertResult> {
    return this.createQueryBuilder()
      .insert()
      .into(UserBoostEntity)
      .values({userId, boostId, amount})
      .onConflict('(user_id, boost_id) DO UPDATE SET amount = :amount')
      .setParameter('amount', amount)
      .execute();
  }
  public async getUserBoostIds(userId: KosUserId): Promise<KosUserBoostId[]> {
    return (
      await this.createQueryBuilder('user_boosts')
        .select('user_boosts.id', 'id')
        .where({userId})
        .getRawMany()
    ).map((resItem) => resItem.id);
  }
}

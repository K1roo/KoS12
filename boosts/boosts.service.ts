import {Injectable} from '@nestjs/common';
import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import {InjectRepository} from '@nestjs/typeorm';
import {validateSync} from 'class-validator';

import {ExternalPictureDto} from '../../../agnostic/common-lib/src/dynamic-picture/external-picture.dto';
import {RawDynamicTextDto} from '../../../agnostic/common-lib/src/dynamic-text/raw-dynamic-text.dto';
import {asClass} from '../../../agnostic/common-lib/src/transformer/class/as-class';
import {shuffleArray} from '../../../agnostic/common-lib/src/utils/shuffle-array';
import {KosBoostId} from '../../../agnostic/kos-lib/src/dto/boost/kos-boost-id';
import {KosBoostInfoDto} from '../../../agnostic/kos-lib/src/dto/boost/kos-boost-info.dto';
import {KosUserBoostId} from '../../../agnostic/kos-lib/src/dto/boost/kos-user-boost-id';
import {KosUserBoostDto} from '../../../agnostic/kos-lib/src/dto/boost/kos-user-boost.dto';
import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {KosBoostsApplyParamsDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/apply/kos-boosts-apply-params.dto';
import {KosBoostsGetInfoParamsDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/get-info/kos-boosts-get-info-params.dto';
import {asKosBoostsGetUserBoostNextDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/get-user-boost/as-kos-boosts-get-user-boost-next.dto';
import {KosBoostsGetUserBoostParamsDto} from '../../../agnostic/kos-lib/src/endpoint/boosts/get-user-boost/kos-boosts-get-user-boost-params.dto';
import {WaveLobbyId} from '../../../agnostic/kos-lib/src/wave-state/wave-lobby-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {RemoteNamespaceType} from '../../../agnostic/reactive-data/remote-namespace-type';
import {ServerFrameType} from '../../../agnostic/reactive-data/server-frame-type';
import {WinstonLogger} from '../../common/logger/logger.service';
import {
  EMIT_BOOST_UPDATE,
  KOS_CHANNEL,
  KOS_USER,
  SEND_APPLIED_BOOST_RESULT,
  SEND_SELECTED_ANSWER,
  USER_STATE,
  WAVE_PARTICIPANT,
} from '../../common/types/event-emitter-keys';
import {KosUserBoostService} from '../../common/types/kos-boosts/boost';
import {UpsertBoostsResult} from '../../common/types/kos-boosts/upsert-boosts-result';
import {UpsertBoostsValues} from '../../common/types/kos-boosts/upsert-boosts-values';
import {UserBoostEmitState} from '../../common/types/kos-boosts/user-boost-emit-state';
import {SystemEvents} from '../../common/types/ws/system-events';
import redisConfig from '../../kos-config/redis/configuration';
import {BOOST_CLASS} from '../../kos-ws-server/src/constants';
import {WsServerError} from '../../kos-ws-server/src/ws/ws-server-error.class';
import {getRandomInt} from '../../utils/rand-int.util';
import {ChannelSessionService} from '../channel-session/channel-session.service';
import {WaveEntity} from '../waves/wave.entity';
import {WsConnectionService} from '../ws-connections/ws-connections.service';
import {WsSubscriptionsService} from '../ws-subscriptions/ws-subscriptions.service';

import {UserBoostEntity} from './user-boost.entity';
import {UserBoostRepository} from './user-boost.repository';

const clientOptions: ClientOptions = {
  transport: Transport.REDIS,
  options: redisConfig,
};

const BOOSTS: Map<KosBoostId, KosUserBoostService> = new Map();

@Injectable()
export class BoostsService {
  private readonly _logger = new WinstonLogger(BoostsService.name);
  private readonly _client: ClientProxy;

  public constructor(
    @InjectRepository(UserBoostRepository)
    private _boostInventoryRepository: UserBoostRepository,
    private _wsSubscriptionsService: WsSubscriptionsService,
    private _channelSessionService: ChannelSessionService,
    private readonly _wsConnectionService: WsConnectionService,
    private _eventEmitter: EventEmitter2,
  ) {
    this._client = ClientProxyFactory.create(clientOptions);
  }

  public registerBoost(targetInstance: any): any {
    const instanceMetaKeys = Reflect.getMetadataKeys(targetInstance);

    if (instanceMetaKeys.includes(BOOST_CLASS)) {
      const proto = Object.getPrototypeOf(targetInstance);

      const applyCb = proto.apply;
      const boostedScoreCalculatorCb = proto.getBoostedScoreValue;

      const b: KosUserBoostService = {
        id: targetInstance.id,
        lootWeight: targetInstance.lootWeight,
        rarity: targetInstance.rarity,
        title: targetInstance.title,
        description: targetInstance.description,
        iconUrl: targetInstance.iconUrl,
        iconDefaultRatio: targetInstance.iconDefaultRatio,
        allowedBeforeAnswer: targetInstance.allowedBeforeAnswer,
        allowedAfterAnswer: targetInstance.allowedAfterAnswer,
        mutateCalculatedStars: targetInstance.mutateCalculatedStars,
        apply: applyCb.bind(targetInstance),
        getBoostedScoreValue: boostedScoreCalculatorCb.bind(targetInstance),
      };
      BOOSTS.set(b.id, b);
    }
  }

  public getBoostsIds(): KosBoostId[] {
    return [...BOOSTS.keys()];
  }

  public getBoostById(boostId: KosBoostId): KosUserBoostService {
    const boost = BOOSTS.get(boostId);
    if (!boost) {
      this._logger.warn('Boost does not exist', {boostId});
      throw new Error(`Boost ${boostId} does not exist`);
    }
    return boost;
  }

  public getBoostsWeights(): {id: KosBoostId; lootWeight: number}[] {
    return [...BOOSTS.values()].map((boostInstance) => ({
      id: boostInstance.id,
      lootWeight: boostInstance.lootWeight,
    }));
  }

  public async getBoostInfoForClient(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<KosBoostInfoDto> {
    const params = asClass(KosBoostsGetInfoParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );
    try {
      const boost = this.getBoostById(params.boostId);
      return new KosBoostInfoDto(
        new RawDynamicTextDto(boost.title),
        new RawDynamicTextDto(boost.description),
        new ExternalPictureDto(boost.iconDefaultRatio, boost.iconUrl),
        boost.allowedBeforeAnswer,
        boost.allowedAfterAnswer,
      );
    } catch (error) {
      throw new WsServerError(subMessage.id, error.message);
    }
  }

  public async getUserBoost(
    userId: KosUserId,
    boostId: KosBoostId,
  ): Promise<UserBoostEntity | null> {
    return (
      (await this._boostInventoryRepository.findOne({userId, boostId})) || null
    );
  }

  public async getUserBoostForClient(
    subMessage: ClientSubscribeFrameLiteral,
    connectionId: WsConnectionId,
  ): Promise<UserBoostEntity | null> {
    const params = asClass(KosBoostsGetUserBoostParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );

    const validationRes = validateSync(params);
    if (validationRes.length) {
      const err = new WsServerError(
        subMessage.id,
        JSON.stringify(validationRes),
      );
      throw err;
    }
    await this._wsSubscriptionsService.setSubscription({
      connectionId: connectionId,
      userId: params.userId,
      passedId: subMessage.id,
      namespace: subMessage.namespace,
      params: {boostId: params.boostId, userId: params.userId},
    });
    return (
      (await this._boostInventoryRepository.findOne({
        userId: params.userId,
        boostId: params.boostId,
      })) || null
    );
  }

  public async upsertUserBoostAmount(
    values: UpsertBoostsValues | UpsertBoostsValues[],
  ): Promise<UpsertBoostsResult[]> {
    return this._boostInventoryRepository.updateUserBoostAmount(values);
  }

  public async decrUserBoostAmount(
    userId: KosUserId,
    boostId: KosBoostId,
    amount: number,
  ): Promise<void> {
    const res = await this._boostInventoryRepository.decrement(
      {userId, boostId},
      'amount',
      amount,
    );
    this._logger.debug('decrUserBoostAmount result', {res});
  }

  public async setUserBoostAmount(
    userId: KosUserId,
    boostId: KosBoostId,
    amount: number,
  ): Promise<void> {
    const insertResult =
      await this._boostInventoryRepository.setUserBoostAmount(
        userId,
        boostId,
        amount,
      );
    this._logger.debug('addUserBoostAmount result', {insertResult});
  }

  public async deleteUserBoost(
    userId: KosUserId,
    boostId: KosBoostId,
  ): Promise<void> {
    const deleteRes = this._boostInventoryRepository.delete({userId, boostId});
    this._logger.debug('deleteUserBoost result', {deleteRes});
  }

  public async getUserBoostIds(userId: KosUserId): Promise<KosUserBoostId[]> {
    return this._boostInventoryRepository.getUserBoostIds(userId);
  }

  public async applyBoost(
    mesId: number,
    params: KosBoostsApplyParamsDto,
    userId: KosUserId,
  ): Promise<void> {
    // TODO: optimize token verification
    const boost = this.getBoostById(params.boostId);
    await boost.apply(
      mesId,
      userId,
      params.lobbyId,
      params.questionIndex,
      params.appliedAt,
    );
  }

  @OnEvent(`${KOS_CHANNEL}.${WAVE_PARTICIPANT}.${SEND_APPLIED_BOOST_RESULT}`)
  public async sendAppliedBoostResults(
    userId: KosUserId,
    wave: WaveEntity,
    boostId: KosBoostId,
    questionIndex: number,
    lobbyId: WaveLobbyId,
  ): Promise<void> {
    const sessionsAmount =
      await this._channelSessionService.getUserChannelSessionsAmount(
        userId,
        wave.channelId,
      );
    if (sessionsAmount > 1) {
      this._client.emit<SystemEvents.NEW_USER_BOOST_STATE, UserBoostEmitState>(
        SystemEvents.NEW_USER_BOOST_STATE,
        {
          params: {
            boostId,
            userId,
          },
          boostState: null,
        },
      );
      this._client.emit<
        SystemEvents.BROADCAST_WAVE_QUESTION_SELECTED_INDEXES,
        {
          waveId: number;
          userId: KosUserId;
          questionIndex: number;
        }
      >(SystemEvents.BROADCAST_WAVE_QUESTION_SELECTED_INDEXES, {
        waveId: wave.id,
        userId,
        questionIndex,
      });
    } else {
      let state: {amount: number} | null = null;
      const userBoost = await this.getUserBoost(userId, boostId);
      if (userBoost) {
        state = {amount: userBoost.amount};
      }
      const boostSubs = await this._wsSubscriptionsService.getSubscriptions(
        RemoteNamespaceType.BOOSTS,
        {boostId, userId},
      );
      for (const subscription of boostSubs) {
        this._wsConnectionService.sendMessage(subscription.connectionId, {
          id: subscription.passedId,
          type: ServerFrameType.NEXT,
          next: asKosBoostsGetUserBoostNextDto().dataToLiteral(
            state ? new KosUserBoostDto(state.amount) : state,
          ),
        });
      }
      this._eventEmitter.emit(
        `${KOS_CHANNEL}.${WAVE_PARTICIPANT}.${SEND_SELECTED_ANSWER}`,
        wave,
        lobbyId,
        userId,
        questionIndex,
        sessionsAmount,
      );
    }
  }

  @OnEvent(`${KOS_USER}.${USER_STATE}.${EMIT_BOOST_UPDATE}`)
  public broadcastUserBoostState(boostState: UserBoostEmitState): void {
    this._client.emit<SystemEvents.NEW_USER_BOOST_STATE, UserBoostEmitState>(
      SystemEvents.NEW_USER_BOOST_STATE,
      boostState,
    );
  }

  public async getRandomBoostsIds(
    amount: number,
  ): Promise<Map<KosBoostId, number>> {
    // initialize array with random boosts ids (can be repeated)
    const boostsToReturn: KosBoostId[] = [];
    while (boostsToReturn.length < amount) {
      /**
       * start array with boosts ids where to pick from the boost id
       * depends on the lootWeight of the boost we have the same of
       * repeated boosts in this array
       */
      let startArray: KosBoostId[] = [];
      const boosts = this.getBoostsWeights();
      for (const boost of boosts) {
        startArray.push(...new Array(boost.lootWeight).fill(boost.id));
      }
      shuffleArray(startArray);
      while (startArray.length && boostsToReturn.length < amount) {
        const pickedBoostId =
          startArray[getRandomInt(0, startArray.length - 1)];
        boostsToReturn.push(pickedBoostId);
        startArray = startArray.filter((boostId) => boostId !== pickedBoostId);
      }
    }
    return boostsToReturn.reduce(
      (
        acc: Map<KosBoostId, number>,
        currVal: KosBoostId,
      ): Map<KosBoostId, number> => {
        let amount = acc.get(currVal);
        acc.set(currVal, amount ? ++amount : 1);
        return acc;
      },
      new Map(),
    );
  }

  public getBoostsIdsByRarity(rarity: number): KosBoostId[] {
    return [...BOOSTS.values()].reduce(
      (boostsByRarity: KosBoostId[], boost) => {
        if (boost.rarity === rarity) {
          boostsByRarity.push(boost.id);
        }
        return boostsByRarity;
      },
      [],
    );
  }

  public getRandomBoostIdByRarity(rarity: number): KosBoostId {
    const boostIds = this.getBoostsIdsByRarity(rarity);
    if (!boostIds.length) {
      throw new Error(`Rarity is not supported, ${rarity}`);
    }
    return boostIds[getRandomInt(0, boostIds.length - 1)];
  }
}

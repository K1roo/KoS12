import {Injectable} from '@nestjs/common';
import {endOfISOWeek, startOfISOWeek} from 'date-fns';
import * as moment from 'moment';

import {asArray} from '../../../agnostic/common-lib/src/transformer/array/as-array';
import {asClass} from '../../../agnostic/common-lib/src/transformer/class/as-class';
import {TwitchChannelId} from '../../../agnostic/common-lib/src/twitch/twitch-channel-id';
import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';
import {LeaderboardApiByLobbyIdParamsDto} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-api-by-lobby-id-params.dto';
import {LeaderboardApiChannelIdsParamsDto} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-api-channel-ids-params.dto';
import {LeaderboardApiMetaParamsDto} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-api-meta-params.dto';
import {LeaderboardApiRangeParamsDto} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-api-range-params.dto';
import {LeaderboardChannelItemDto} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-channel-item.dto';
import {LeaderboardChannelsDto} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-channels.dto';
import {LeaderboardEntryDto} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-entry.dto';
import {LeaderboardMetaDto} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-meta.dto';
import {LeaderboardTypes} from '../../../agnostic/kos-lib/src/leaderboard/leaderboard-types';
import {WaveLobbyId} from '../../../agnostic/kos-lib/src/wave-state/wave-lobby-id';
import {WsConnectionId} from '../../../agnostic/native/ws-connection-id';
import {ClientSubscribeFrameLiteral} from '../../../agnostic/reactive-data/client-subscribe-frame-literal';
import {IdentitiesService} from '../identities/identities.service';
import {LobbyService} from '../lobby/lobby.service';

import {RawLeaderboardItemLiteral} from './raw-leaderboard-item-literal';

@Injectable()
export class LeaderboardService {
  public constructor(
    private readonly _lobbyService: LobbyService,
    private readonly _identitiesService: IdentitiesService,
  ) {}

  public async getChannelIds(
    subMessage: ClientSubscribeFrameLiteral,
    _connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<unknown> {
    const currentDate = new Date();
    const params = asClass(LeaderboardApiChannelIdsParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );

    const leaderboardType = params.leaderboardType;

    let channelIds: TwitchChannelId[] = [];
    switch (leaderboardType) {
      case LeaderboardTypes.WEEKLY:
        const weekStart = moment().startOf('isoWeek').toDate();
        const weekStartFromDateFns = startOfISOWeek(currentDate);
        const weekEnd = moment().endOf('isoWeek').toDate();
        const weekEndFromDateFns = endOfISOWeek(currentDate);
        console.log('Comparing dates in getMeta');
        console.log('weekStart', weekStart);
        console.log('weekStartFromDateFns', weekStartFromDateFns);
        console.log('weekEnd', weekEnd);
        console.log('weekEndFromDateFns', weekEndFromDateFns);

        channelIds = await this._lobbyService.getUserChannelIds(
          userId,
          weekStart,
          weekEnd,
        );
        break;
      case LeaderboardTypes.GLOBAL:
        channelIds = await this._lobbyService.getUserChannelIds(userId);
        break;
    }

    // get channel names by channel ids
    const channelIdsAndNames =
      await this._identitiesService.getChannelDisplayNamesByChannelIds(
        channelIds,
      );

    // TODO: remove when Twitch Connect is released
    const channelIdsAndNamesStub: {[key: string]: string} = {
      '75286424': 'matthew16',
      '261218727': 'illiasendetskyi',
      '113888380': 'alexksso',
      '423157463': 'zatmonkey',
    };

    const channelIdItems: LeaderboardChannelItemDto[] = [];
    channelIds.forEach((channelId) => {
      channelIdItems.push(
        new LeaderboardChannelItemDto(
          channelId,
          channelIdsAndNames[channelId] ||
            channelIdsAndNamesStub[channelId] || // temp solution before Twitch Connect is ready
            channelId, // workaround in case the channel name is not found
        ),
      );
    });

    const leaderboardMeta = new LeaderboardChannelsDto(channelIdItems);

    return asClass(LeaderboardChannelsDto).dataToLiteral(leaderboardMeta);
  }

  public async getMeta(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<unknown> {
    const currentDate = new Date();
    const params = asClass(LeaderboardApiMetaParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );

    const leaderboardType = params.leaderboardType;
    const channelId = params.channelId;

    let count = 0;
    switch (leaderboardType) {
      case LeaderboardTypes.WEEKLY:
        const weekStart = moment().startOf('isoWeek').toDate();
        const weekStartFromDateFns = startOfISOWeek(currentDate);
        const weekEnd = moment().endOf('isoWeek').toDate();
        const weekEndFromDateFns = endOfISOWeek(currentDate);
        console.log('Comparing dates in getMeta');
        console.log('weekStart', weekStart);
        console.log('weekStartFromDateFns', weekStartFromDateFns);
        console.log('weekEnd', weekEnd);
        console.log('weekEndFromDateFns', weekEndFromDateFns);

        count = await this._lobbyService.getLeaderboardSize(
          channelId,
          weekStart,
          weekEnd,
        );
        break;
      case LeaderboardTypes.GLOBAL:
        count = await this._lobbyService.getLeaderboardSize(channelId);
        break;
    }

    const leaderboardMeta = new LeaderboardMetaDto(count);

    return asClass(LeaderboardMetaDto).dataToLiteral(leaderboardMeta);
  }

  public async getRange(
    subMessage: ClientSubscribeFrameLiteral,
  ): Promise<unknown> {
    const currentDate = new Date();
    const params = asClass(LeaderboardApiRangeParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );

    const leaderboardType = params.leaderboardType;
    const channelId = params.channelId;
    const startPosition = params.start;
    const endPosition = params.end;

    let items: RawLeaderboardItemLiteral[] = [];
    switch (leaderboardType) {
      case LeaderboardTypes.WEEKLY:
        const weekStart = moment().startOf('isoWeek').toDate();
        const weekStartFromDateFns = startOfISOWeek(currentDate);
        const weekEnd = moment().endOf('isoWeek').toDate();
        const weekEndFromDateFns = endOfISOWeek(currentDate);
        console.log('Comparing dates in getRange');
        console.log('weekStart', weekStart);
        console.log('weekStartFromDateFns', weekStartFromDateFns);
        console.log('weekEnd', weekEnd);
        console.log('weekEndFromDateFns', weekEndFromDateFns);

        items = await this._lobbyService.getLeaderboard(
          channelId,
          startPosition,
          endPosition,
          weekStart,
          weekEnd,
        );
        break;
      case LeaderboardTypes.GLOBAL:
        items = await this._lobbyService.getLeaderboard(
          channelId,
          startPosition,
          endPosition,
        );
        break;
    }

    const leaderboardEntries = this._rawLeaderboardItemsToEntries(items);

    return asArray(asClass(LeaderboardEntryDto)).dataToLiteral(
      leaderboardEntries,
    );
  }

  public async getByLobbyId(
    subMessage: ClientSubscribeFrameLiteral,
    _connectionId: WsConnectionId,
    userId: KosUserId,
  ): Promise<unknown> {
    const params = asClass(LeaderboardApiByLobbyIdParamsDto).literalToData(
      subMessage.params,
      ['params'],
    );

    const lobbyId = params.lobbyId;
    const items = await this._lobbyService.getLobbyLeaderboard(lobbyId, userId);

    const leaderboardEntries = this._rawLeaderboardItemsToEntries(items);

    return asArray(asClass(LeaderboardEntryDto)).dataToLiteral(
      leaderboardEntries,
    );
  }

  public async getByLobbyIdForWaveScreen(
    userId: KosUserId,
    lobbyId: WaveLobbyId,
  ): Promise<LeaderboardEntryDto[]> {
    const items = await this._lobbyService.getLobbyLeaderboard(lobbyId, userId);
    return this._rawLeaderboardItemsToEntries(items);
  }

  private _rawLeaderboardItemsToEntries(
    items: RawLeaderboardItemLiteral[],
  ): LeaderboardEntryDto[] {
    return items.map((item) => {
      const position = parseInt(item.position);
      const score = parseInt(item.score);

      return new LeaderboardEntryDto(
        item.userId,
        item.name || item.anonymousName,
        item.picture || 'https://assets.azarus.io/kos/unknown-user.png',
        position,
        score,
        position === 1,
        position === 1,
      );
    });
  }
}

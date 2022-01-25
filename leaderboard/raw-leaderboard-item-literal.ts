import {KosUserId} from '../../../agnostic/kos-lib/src/dto/user/kos-user-id';

export interface RawLeaderboardItemLiteral {
  userId: KosUserId;
  name: string;
  anonymousName: string;
  picture: string;
  position: string;
  score: string;
}

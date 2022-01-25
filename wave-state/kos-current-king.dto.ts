import {asOneOfDynamicPictureDto} from '../../../common-lib/src/dynamic-picture/as-one-of-dynamic-picture-dto';
import {OneOfDynamicPictureDto} from '../../../common-lib/src/dynamic-picture/one-of-dynamic-picture.dto';
import {field} from '../../../common-lib/src/transformer/class/field';
import {asNumber} from '../../../common-lib/src/transformer/number/as-number';
import {asString} from '../../../common-lib/src/transformer/string/as-string';
import {KosUserId} from '../dto/user/kos-user-id';

export class KosCurrentKingDto {
  @field(asString()) public readonly nickname: string;

  @field(asOneOfDynamicPictureDto())
  public readonly avatar: OneOfDynamicPictureDto;

  @field(asNumber()) public readonly starsAmount: number;

  //will be needed in the case if the client app subscribes on userCommonInfo by userId
  @field(asString<KosUserId>()) public readonly userId: KosUserId;

  public constructor(
    nickname: string,
    avatar: OneOfDynamicPictureDto,
    starsAmount: number,
    userId: KosUserId,
  ) {
    this.nickname = nickname;
    this.avatar = avatar;
    this.starsAmount = starsAmount;
    this.userId = userId;
  }
}

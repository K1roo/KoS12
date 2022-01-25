import {Controller, Get} from '@nestjs/common';

import {TwitchStreamsResponse} from './interfaces/streams-response.interface';
import {TwitchService} from './twitch.service';

@Controller('twitch')
export class TwitchController {
  public constructor(private _twitchService: TwitchService) {}

  @Get('channels')
  public async getChannels(): Promise<TwitchStreamsResponse[] | []> {
    return this._twitchService.getChannels();
  }
}

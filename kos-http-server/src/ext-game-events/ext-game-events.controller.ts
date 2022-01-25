import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ValidationPipe,
} from '@nestjs/common';

import {PostExtGameEventFilterDto} from './dto/create-game-event-filter.dto';
import {GetExtGameEventsFilterDto} from './dto/get-game-events-filter.dto';
import {ExtGameEventsService} from './ext-game-events.service';
import {GameEvent} from './game-event.entity';

@Controller('ext-game-events')
export class ExtGameEventsController {
  public constructor(
    private readonly _extGameEventsService: ExtGameEventsService,
  ) {}

  @Get()
  public getExtGameEvents(
    @Query(new ValidationPipe({transform: true}))
    filterDto: GetExtGameEventsFilterDto,
  ): Promise<GameEvent[]> {
    return this._extGameEventsService.getExtGameEvents(
      filterDto.summonerName,
      filterDto.skip,
      filterDto.limit,
    );
  }

  @Post()
  public async postExtGameEvent(
    @Body(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true}))
    gameEventData: PostExtGameEventFilterDto,
  ): Promise<void> {
    await this._extGameEventsService.createExtGameEvent(gameEventData);
  }
}

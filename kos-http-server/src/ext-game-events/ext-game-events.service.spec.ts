import {Test, TestingModule} from '@nestjs/testing';

import {ExtGameEventsService} from './ext-game-events.service';

describe('ExtGameEventsService', () => {
  let service: ExtGameEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtGameEventsService],
    }).compile();

    service = module.get<ExtGameEventsService>(ExtGameEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import {Test, TestingModule} from '@nestjs/testing';

import {ExtGameEventsController} from './ext-game-events.controller';

describe('ExtGameEventsController', () => {
  let controller: ExtGameEventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExtGameEventsController],
    }).compile();

    controller = module.get<ExtGameEventsController>(ExtGameEventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

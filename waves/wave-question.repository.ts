import {EntityRepository, Repository} from 'typeorm';

import {WinstonLogger} from '../../common/logger/logger.service';
import {WaveQuestion} from '../../common/types/db-entities/wave-question/wave-question';

import {WaveQuestionEntity} from './wave-question.entity';

@EntityRepository(WaveQuestionEntity)
export class WaveQuestionRepository extends Repository<WaveQuestionEntity> {
  private _logger: WinstonLogger;
  public constructor() {
    super();
    this._logger = new WinstonLogger(WaveQuestionRepository.name);
  }

  public async createWaveQuestion(
    data: // {lobby: number} &
    Partial<WaveQuestion>,
  ): Promise<WaveQuestion> {
    this._logger.debug('Creating new wave question', {data});
    const waveQuestion = this.create(data);
    await waveQuestion.save();
    return waveQuestion;
  }
}

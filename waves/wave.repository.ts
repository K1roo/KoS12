import {
  EntityRepository,
  FindConditions,
  In,
  Repository,
  UpdateResult,
} from 'typeorm';

import {SupportedGames} from '../../../agnostic/supported-games';
import {WinstonLogger} from '../../common/logger/logger.service';
import {Wave} from '../../common/types/db-entities/wave/wave';
import {WaveStatus} from '../../common/types/db-entities/wave/wave-status';

import {WaveEntity} from './wave.entity';

@EntityRepository(WaveEntity)
export class WaveRepository extends Repository<WaveEntity> {
  private _logger: WinstonLogger;
  public constructor() {
    super();
    this._logger = new WinstonLogger('WaveRepository');
  }

  public async getWaves(
    channelId?: string,
    skip?: number,
    limit?: number,
  ): Promise<WaveEntity[]> {
    let query: FindConditions<WaveEntity> | FindConditions<WaveEntity[]> = {};
    if (typeof channelId === 'string') query.channelId = channelId;
    const waves = await this.find({
      where: query,
      skip: typeof skip === 'number' ? skip : 0,
      take: typeof limit === 'number' ? limit : 100,
    });
    this._logger.verbose('Got waves', {channelId, skip, limit, waves});
    return waves;
  }

  public async createWave(
    data: {
      channelId: string;
      questionsAmount: number;
      game: SupportedGames;
    } & Partial<Wave>,
  ): Promise<WaveEntity> {
    const wave = this.create(data);
    const createdWave = await wave.save();
    this._logger.log('New wave created', {createdWave, data});
    return createdWave;
  }
  /**
   *
   * @param channelId
   * @param userId
   * @returns {WaveEntity | undefined} WaveEntity
   * @desc if user id is provided joins lobby with this user id
   */
  public async getLatestWave(channelId: string): Promise<WaveEntity | null> {
    // TODO: refactor
    /**
     * commented query really fetches all waves and then takes the last one
     * if to use .limit(1) in a chain then only one question joins in leftJoin
     */
    // const wave = await this.createQueryBuilder('wave')
    //   .where('wave.channelId = :channelId', {channelId})
    //   .leftJoinAndSelect('wave.questions', 'questions')
    //   .orderBy({
    //     'wave.id': 'DESC',
    //     'questions.questionIndex': 'ASC',
    //   })
    //   .getOne();
    const wave = await this.findOne({
      where: {channelId},
      relations: ['questions'],
      order: {id: 'DESC'},
    });
    // TODO: fetch already sorted questions from db
    if (wave) {
      wave.questions = wave.questions.sort(
        (a, b) => a.questionIndex - b.questionIndex,
      );
    }
    return wave || null;
  }

  public async getWaveById(id: number): Promise<WaveEntity | undefined> {
    // TODO: add cache, add optional joins
    return this.createQueryBuilder('wave')
      .where('wave.id = :id', {id})
      .leftJoinAndSelect('wave.questions', 'questions')
      .orderBy({
        'questions.questionIndex': 'ASC',
      })
      .getOne();
  }

  public async updateWaveStatus(
    waveId: number,
    status: WaveStatus,
  ): Promise<UpdateResult> {
    /**TODO: consider transactions usage (based on status
     * different data is returned to the client on new subs) */
    return this.update({id: waveId}, {status});
  }

  public async getLastResolvedWave(
    channelId: string,
  ): Promise<WaveEntity | undefined> {
    return this.findOne({
      where: {channelId, status: In(['wave_results', 'finished'])},
      order: {id: 'DESC'},
    });
  }

  public async updateWave(
    waveId: number,
    data: Partial<Wave>,
  ): Promise<UpdateResult> {
    /**TODO: consider transactions usage (based on status
     * different data is returned to the client on new subs) */
    return this.update({id: waveId}, data);
  }

  public async getWaveStatus(waveId: number): Promise<WaveStatus | null> {
    const res = await this.createQueryBuilder('wave')
      .select('wave.status', 'status')
      .where({id: waveId})
      .getRawOne();
    if (res) return res.status as WaveStatus;
    return null;
  }
}

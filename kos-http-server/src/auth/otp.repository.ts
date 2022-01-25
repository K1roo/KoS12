import {EntityRepository, Repository} from 'typeorm';

import {WinstonLogger} from '../../../common/logger/logger.service';

import {CreateOtpDto} from './dto/create-otp.dto';
import {OtpEntity} from './otp.entity';

@EntityRepository(OtpEntity)
export class OtpRepository extends Repository<OtpEntity> {
  private _logger: WinstonLogger;
  public constructor() {
    super();
    this._logger = new WinstonLogger('OtpRepository');
  }

  public async getOtpByEmailAndCode(
    email: string,
    code: string,
  ): Promise<OtpEntity | undefined> {
    const otpEntity = await this.findOne({
      where: {email, code},
      order: {id: 'DESC'}, // get latest one
      relations: ['user'],
    });
    this._logger.verbose('Got otp by email and code', {email, code, otpEntity});
    return otpEntity;
  }

  public async getOtpByEmail(email: string): Promise<OtpEntity | undefined> {
    const otpEntity = await this.findOne({
      where: {email},
      order: {id: 'DESC'}, // get latest one
    });
    this._logger.verbose('Got otp by email', {email, otpEntity});
    return otpEntity;
  }

  public async deleteOtpsByEmail(email: string): Promise<void> {
    const results = await this.delete({email});
    this._logger.verbose('Deleted otps by email', {email, results});
  }

  public async createOtp(otpData: CreateOtpDto): Promise<OtpEntity> {
    const {email, user, code} = otpData;
    const otp = new OtpEntity();
    otp.email = email;
    otp.user = user;
    otp.code = code;
    const createdOtp = await otp.save();
    this._logger.verbose('New otp created', {createdOtp, otpData});
    return createdOtp;
  }
}

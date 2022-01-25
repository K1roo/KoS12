import {Controller, Get} from '@nestjs/common';

@Controller('')
export class AppController {
  @Get()
  public getHello(): {message: string; revision: string; env: string} {
    return {
      message: 'Welcome to the KoS API',
      revision: `${process.env.BRANCH}-${process.env.REVISION}`,
      env: `${process.env.NODE_ENV}`,
    };
  }
}

import {
  ExceptionFilter,
  Catch,
  HttpException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';

import {WinstonLogger} from '../../common/logger/logger.service';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private _logger: WinstonLogger;
  public constructor() {
    this._logger = new WinstonLogger('ErrorFilter');
  }
  public catch(error: Error | HttpException, host: ArgumentsHost): any {
    let response = host.switchToHttp().getResponse();
    /**
     * TODO: implement sentry notification either right here or integrate it with logger
     */
    if (error instanceof HttpException) {
      let resp = error.getResponse();
      this._logger.warn(error.message, {resp});
      if (typeof resp === 'string') resp = {message: resp};
      return response.status(error.getStatus()).send(resp);
    } else {
      this._logger.error(error);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }

    // if (status === HttpStatus.UNAUTHORIZED)
    //   return response.status(status).render('views/401');
    // if (status === HttpStatus.NOT_FOUND)
    //   return response.status(status).render('views/404');
    // if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
    //   if (process.env.NODE_ENV === 'production') {
    //     console.error(error.stack);
    //     return response.status(status).render('views/500');
    //   } else {
    //     let message = error.stack;
    //     return response.status(status).send(message);
    //   }
    // }
  }
}

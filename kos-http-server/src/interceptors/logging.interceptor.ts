import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {v4 as uuidv4} from 'uuid';

import {WinstonLogger} from '../../../common/logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private _logger: WinstonLogger;
  public constructor() {
    this._logger = new WinstonLogger('LoggingInterceptor');
  }
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const start = Date.now();
    const correlationId = uuidv4();
    let healthCheckRequest = false;
    const {
      headers,
      query,
      url,
      baseUrl,
      originalUrl,
      ips,
      ip,
      body,
      _parsedUrl,
      method,
      cookies,
    } = context.switchToHttp().getRequest();
    if (
      headers !== undefined &&
      typeof headers['user-agent'] === 'string' &&
      headers['user-agent'].includes('ELB-HealthChecker')
    ) {
      healthCheckRequest = true;
    }
    if (!healthCheckRequest) {
      this._logger.debug('API request', {
        correlationId,
        headers,
        query,
        url,
        baseUrl,
        originalUrl,
        ips,
        ip,
        body,
        _parsedUrl,
        method,
        cookies,
      });
    }

    /**
     * TODO: implement response mapping in separate `transform.interceptor.ts` if needed
     * https://docs.nestjs.com/interceptors#response-mapping
     */
    return next.handle().pipe(
      tap(() => {
        if (!healthCheckRequest) {
          const timeConsumed = Date.now() - start;
          const response = context.switchToHttp().getResponse();
          const {statusCode} = response;
          this._logger.debug('API response', {
            correlationId,
            statusCode,
            timeConsumed,
          });
        }
      }),
    );
  }
}

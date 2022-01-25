import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

@Injectable()
export class RequestTimeConsumingInterceptor implements NestInterceptor {
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const timeConsumed = Date.now() - start;
        const response = context.switchToHttp().getResponse();
        response.header('x-tc', timeConsumed);
      }),
    );
  }
}

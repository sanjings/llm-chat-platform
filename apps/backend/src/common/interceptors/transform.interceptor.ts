import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { StandardResponse } from '../response/standard.response';
import { SUCCESS_MESSAGE_KEY } from '../decorators/success-message.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StandardResponse) {
          return data;
        }

        const message = this.reflector.get<string>(SUCCESS_MESSAGE_KEY, context.getHandler());

        return StandardResponse.success(data, message);
      })
    );
  }
}

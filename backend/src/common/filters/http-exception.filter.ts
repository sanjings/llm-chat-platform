import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { StandardResponse } from '../response/standard.response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();

    if (status === HttpStatus.UNAUTHORIZED) {
      return res.json(StandardResponse.tokenExpired());
    }

    if (status === HttpStatus.FORBIDDEN) {
      return res.json(StandardResponse.forbidden());
    }

    const errRes = exception.getResponse();
    const message =
      typeof errRes === 'object' && errRes.message ? (errRes as any).message : exception.message || '服务器异常';

    res.json(StandardResponse.fail(message, status));
  }
}

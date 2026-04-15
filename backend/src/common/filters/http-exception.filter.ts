import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { StandardResponse } from '../response/standard.response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = '服务器异常';
    if (exception instanceof HttpException) {
      const errRes = exception.getResponse();
      if (typeof errRes === 'string') {
        message = errRes;
      } else if (typeof errRes === 'object' && errRes && 'message' in errRes) {
        const m = (errRes as { message: string | string[] }).message;
        message = Array.isArray(m) ? m.join('; ') : m || exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.setContext('ExceptionFilter');
    this.logger.error(`[${req.method}] ${req.originalUrl} 异常：${message}`, stack);

    if (status === HttpStatus.UNAUTHORIZED) {
      return res.json(StandardResponse.tokenExpired());
    }

    if (status === HttpStatus.FORBIDDEN) {
      return res.json(StandardResponse.forbidden());
    }

    res.json(StandardResponse.fail(message, status));
  }
}

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    // 默认 500
    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器异常';

    // 如果是 Nest 的 HttpException（400/401/403/404 都走这）
    if (exception instanceof HttpException) {
      code = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exceptionResponse;
      } else {
        message = exceptionResponse;
      }
    }
    // 其他未知错误
    else {
      message = exception?.message || message;
    }

    res.status(code).json({
      code,
      message,
      data: null
    });
  }
}

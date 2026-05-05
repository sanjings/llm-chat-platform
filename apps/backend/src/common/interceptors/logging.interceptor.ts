import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from 'src/infrastructure/logger/logger.service';
import { safeJson, sanitizeForLog } from '../utils/request-log-sanitize';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: { sub?: string } }>();
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    this.logger.setContext(context.getClass().name);

    const segments: string[] = [`请求 => ${method} ${originalUrl}`, `IP:${ip}`];

    const sub = req.user?.sub;
    if (sub) {
      segments.push(`userId:${sub}`);
    }

    if (req.params && Object.keys(req.params).length > 0) {
      segments.push(`params:${safeJson(sanitizeForLog(req.params))}`);
    }

    if (req.query && Object.keys(req.query).length > 0) {
      segments.push(`query:${safeJson(sanitizeForLog(req.query))}`);
    }

    if (this.shouldLogBody(method)) {
      const ct = String(req.headers['content-type'] || '');
      if (ct.includes('multipart/form-data')) {
        segments.push('body:[multipart/form-data,已省略文件二进制]');
        if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
          segments.push(`fields:${safeJson(sanitizeForLog(req.body))}`);
        }
      } else if (req.body !== undefined && req.body !== null) {
        if (Buffer.isBuffer(req.body)) {
          segments.push(`body:[Buffer len=${req.body.length}]`);
        } else if (typeof req.body === 'object' && Object.keys(req.body).length === 0) {
          segments.push('body:{}');
        } else {
          segments.push(`body:${safeJson(sanitizeForLog(req.body))}`);
        }
      }
    }

    this.logger.log(segments.join(' | '));

    return next.handle().pipe(
      tap({
        finalize: () => {
          const cost = Date.now() - startTime;
          this.logger.log(`响应 <= ${method} ${originalUrl} 耗时:${cost}ms`);
        }
      })
    );
  }

  private shouldLogBody(method: string): boolean {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return false;
    }
    // 流式接口仍可能有 JSON body，照常打日志（内容已截断）
    return true;
  }
}

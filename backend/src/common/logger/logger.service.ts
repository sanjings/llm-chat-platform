import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private logger = new Logger();

  setContext(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string, ...meta: any[]) {
    this.logger.log(message, ...meta);
  }

  error(message: string, trace?: string, ...meta: any[]) {
    this.logger.error(message, trace, ...meta);
  }

  warn(message: string, ...meta: any[]) {
    this.logger.warn(message, ...meta);
  }

  debug(message: string, ...meta: any[]) {
    this.logger.debug(message, ...meta);
  }

  verbose(message: string, ...meta: any[]) {
    this.logger.verbose(message, ...meta);
  }
}

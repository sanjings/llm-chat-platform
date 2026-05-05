import { HttpStatus } from '@nestjs/common';

export class StandardResponse<T> {
  constructor(
    public readonly code: number,
    public readonly message: string,
    public readonly data: T | null
  ) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static success<T>(data: T, message: string = 'success') {
    return new StandardResponse(HttpStatus.OK, message, data);
  }

  static fail(message: string = 'fail', code: number = HttpStatus.INTERNAL_SERVER_ERROR) {
    return new StandardResponse(code, message, null);
  }

  static tokenExpired() {
    return this.fail('登录已过期，请重新登录', HttpStatus.UNAUTHORIZED);
  }

  static forbidden() {
    return this.fail('没有访问权限', HttpStatus.FORBIDDEN);
  }
}

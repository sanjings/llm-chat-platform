import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtPayload => {
  const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
  return req.user;
});

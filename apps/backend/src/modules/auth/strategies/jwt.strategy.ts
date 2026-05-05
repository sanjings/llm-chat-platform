import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly redisService: RedisService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'dev_jwt_secret'
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') throw new UnauthorizedException('token 类型不合法');

    const redis = this.redisService.getClient();
    const [tokenVersion, sessionExists, blacklisted] = await Promise.all([
      redis.get(`auth:user:tokenVersion:${payload.sub}`),
      redis.sismember(`auth:user:sessions:${payload.sub}`, payload.sid),
      redis.exists(`auth:blacklist:access:${payload.jti}`)
    ]);

    if (tokenVersion && Number(tokenVersion) !== payload.ver) {
      throw new UnauthorizedException('登录态已失效，请重新登录');
    }
    if (!sessionExists) throw new UnauthorizedException('会话已失效，请重新登录');
    if (blacklisted) throw new UnauthorizedException('token 已失效，请重新登录');

    return payload;
  }
}

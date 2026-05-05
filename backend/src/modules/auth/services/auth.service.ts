import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hashSync } from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from '../dtos/auth.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class AuthService {
  private readonly accessExpiresInSeconds: number;
  private readonly refreshExpiresInSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService
  ) {
    this.accessExpiresInSeconds = this.parseExpiresToSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m',
      15 * 60
    );
    this.refreshExpiresInSeconds = this.parseExpiresToSeconds(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      7 * 24 * 60 * 60
    );
  }

  async register(body: RegisterDto) {
    await this.userService.createUser({ ...body, password: this.hashPassword(body.password) });
  }

  async registerLogin(body: RegisterDto) {
    const user = await this.userService.createUser({ ...body, password: this.hashPassword(body.password) });

    return this.buildAuthResponse(user.id, user.phone, user.nickname, user.avatar ?? null);
  }

  async login(body: LoginDto) {
    const user = await this.userService.getUserByPhoneOrThrowForLogin(body.phone);

    const valid = await compare(body.password, user.password);
    if (!valid) throw new BadRequestException('账号或密码错误');

    return this.buildAuthResponse(user.id, user.phone, user.nickname, user.avatar ?? null);
  }

  async refresh(body: RefreshTokenDto) {
    const payload = this.verifyRefreshToken(body.refreshToken);
    await this.assertSessionValid(payload.sub, payload.sid, payload.ver, body.refreshToken);

    const user = await this.userService.getPublicUserById(payload.sub);
    return this.buildAuthResponse(user.id, user.phone, user.nickname, user.avatar, payload.sid, payload.ver);
  }

  async logout(payload: JwtPayload, authorization?: string) {
    await this.removeSession(payload.sub, payload.sid);
    await this.blacklistAccessToken(payload, authorization);
  }

  async revokeAllSessions(userId: string) {
    const nextVersion = await this.incrementTokenVersion(userId);
    await this.clearUserSessions(userId);
    return { tokenVersion: nextVersion };
  }

  private hashPassword(password: string, salt: number = 10) {
    return hashSync(password, salt);
  }

  private async buildAuthResponse(
    userId: string,
    phone: string,
    nickname: string,
    avatar: string | null,
    sid?: string,
    ver?: number
  ) {
    const sessionId = sid || randomUUID();
    const tokenVersion = ver ?? (await this.getTokenVersion(userId));
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessPayload: JwtPayload = {
      sub: userId,
      sid: sessionId,
      jti: accessJti,
      ver: tokenVersion,
      type: 'access'
    };
    const refreshPayload: JwtPayload = {
      sub: userId,
      sid: sessionId,
      jti: refreshJti,
      ver: tokenVersion,
      type: 'refresh'
    };

    const accessToken = this.jwtService.sign(accessPayload, { expiresIn: this.accessExpiresInSeconds });
    const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: this.refreshExpiresInSeconds });

    await this.saveSession(userId, sessionId, refreshToken);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.accessExpiresInSeconds,
      refreshTokenExpiresIn: this.refreshExpiresInSeconds,
      userInfo: {
        id: userId,
        phone,
        nickname,
        avatar
      }
    };
  }

  private verifyRefreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('refreshToken 无效或已过期');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('refreshToken 类型不合法');
    return payload;
  }

  private async assertSessionValid(userId: string, sessionId: string, ver: number, refreshToken: string) {
    const currentVersion = await this.getTokenVersion(userId);
    if (currentVersion !== ver) throw new UnauthorizedException('登录态已失效，请重新登录');

    const redis = this.redisService.getClient();
    const [sessionExists, refreshHashStored] = await Promise.all([
      redis.sismember(this.buildUserSessionsKey(userId), sessionId),
      redis.get(this.buildRefreshSessionKey(sessionId))
    ]);

    if (!sessionExists || !refreshHashStored) throw new UnauthorizedException('会话已失效，请重新登录');
    if (refreshHashStored !== this.hashToken(refreshToken)) throw new UnauthorizedException('refreshToken 已失效');
  }

  private async saveSession(userId: string, sessionId: string, refreshToken: string) {
    const redis = this.redisService.getClient();
    await redis
      .multi()
      .set(this.buildRefreshSessionKey(sessionId), this.hashToken(refreshToken), 'EX', this.refreshExpiresInSeconds)
      .sadd(this.buildUserSessionsKey(userId), sessionId)
      .exec();
  }

  private async removeSession(userId: string, sessionId: string) {
    const redis = this.redisService.getClient();
    await redis
      .multi()
      .del(this.buildRefreshSessionKey(sessionId))
      .srem(this.buildUserSessionsKey(userId), sessionId)
      .exec();
  }

  private async clearUserSessions(userId: string) {
    const redis = this.redisService.getClient();
    const sessionsKey = this.buildUserSessionsKey(userId);
    const sessionIds = await redis.smembers(sessionsKey);
    if (sessionIds.length > 0) {
      const pipeline = redis.multi();
      sessionIds.forEach((sid) => pipeline.del(this.buildRefreshSessionKey(sid)));
      pipeline.del(sessionsKey);
      await pipeline.exec();
      return;
    }
    await redis.del(sessionsKey);
  }

  private async blacklistAccessToken(payload: JwtPayload, authorization?: string) {
    const token = this.extractBearerToken(authorization);
    if (!token || !payload.exp || !payload.jti) return;
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;
    await this.redisService
      .getClient()
      .set(this.buildAccessBlacklistKey(payload.jti), this.hashToken(token), 'EX', ttl);
  }

  private async getTokenVersion(userId: string) {
    const redis = this.redisService.getClient();
    const key = this.buildTokenVersionKey(userId);
    const existing = await redis.get(key);
    if (existing) return Number(existing);
    await redis.set(key, '1');
    return 1;
  }

  private async incrementTokenVersion(userId: string) {
    const redis = this.redisService.getClient();
    const key = this.buildTokenVersionKey(userId);
    const current = await this.getTokenVersion(userId);
    const next = current + 1;
    await redis.set(key, String(next));
    return next;
  }

  private parseExpiresToSeconds(value: string, fallbackSeconds: number) {
    if (!value) return fallbackSeconds;
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) return asNumber;
    const matched = /^(\d+)([smhd])$/.exec(value);
    if (!matched) return fallbackSeconds;
    const amount = Number(matched[1]);
    const unit = matched[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return amount * (multipliers[unit] || 1);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private extractBearerToken(authorization?: string) {
    if (!authorization) return '';
    const [scheme, token] = authorization.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : '';
  }

  private buildRefreshSessionKey(sessionId: string) {
    return `auth:refresh:session:${sessionId}`;
  }

  private buildUserSessionsKey(userId: string) {
    return `auth:user:sessions:${userId}`;
  }

  private buildTokenVersionKey(userId: string) {
    return `auth:user:tokenVersion:${userId}`;
  }

  private buildAccessBlacklistKey(jti: string) {
    return `auth:blacklist:access:${jti}`;
  }
}

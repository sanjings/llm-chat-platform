import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';

const parseExpiresToSeconds = (value: string | undefined, fallbackSeconds: number) => {
  if (!value) return fallbackSeconds;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) return asNumber;
  const matched = /^(\d+)([smhd])$/.exec(value);
  if (!matched) return fallbackSeconds;
  const amount = Number(matched[1]);
  const unit = matched[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (multipliers[unit] || 1);
};

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'dev_jwt_secret',
        signOptions: { expiresIn: parseExpiresToSeconds(config.get<string>('JWT_ACCESS_EXPIRES_IN'), 15 * 60) }
      })
    }),
    UserModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, PassportModule]
})
export class AuthModule {}

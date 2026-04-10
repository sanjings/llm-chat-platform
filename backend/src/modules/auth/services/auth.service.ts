import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { compare, hash } from 'bcryptjs';
import { LoginDto, RegisterDto } from '../dtos/auth.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(body: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { phone: body.phone } });
    if (exists) throw new BadRequestException('手机号已注册');

    const password = await hash(body.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: body.phone,
        password,
        nickname: body.nickname,
        avatar: body.avatar
      }
    });
    return this.buildAuthResponse(user.id, user.phone, user.nickname, user.avatar);
  }

  async login(body: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: body.phone } });
    if (!user) throw new UnauthorizedException('账号或密码错误');

    const valid = await compare(body.password, user.password);
    if (!valid) throw new UnauthorizedException('账号或密码错误');

    return this.buildAuthResponse(user.id, user.phone, user.nickname, user.avatar);
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatar: true
      }
    });
  }

  private buildAuthResponse(userId: string, phone: string, nickname: string, avatar?: string | null) {
    const payload: JwtPayload = { sub: userId, phone, nickname, avatar };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: userId,
        phone,
        nickname,
        avatar
      }
    };
  }
}

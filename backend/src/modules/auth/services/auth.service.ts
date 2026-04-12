import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hashSync } from 'bcryptjs';
import { LoginDto, RegisterDto } from '../dtos/auth.dto';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  async register(body: RegisterDto) {
    this.userService.createUser({ ...body, password: this.hashPassword(body.password) });
  }

  async registerLogin(body: RegisterDto) {
    const user = await this.userService.createUser({ ...body, password: this.hashPassword(body.password) });

    return this.buildAuthResponse(user.id, user.phone, user.nickname, user.avatar);
  }

  async login(body: LoginDto) {
    const user = await this.userService.getUserByPhone(body.phone);
    if (!user) throw new UnauthorizedException('账号不存在');

    const valid = await compare(body.password, user.password);
    if (!valid) throw new UnauthorizedException('账号或密码错误');

    return this.buildAuthResponse(user.id, user.phone, user.nickname, user.avatar);
  }

  private hashPassword(password: string, salt: number = 10) {
    return hashSync(password, salt);
  }

  private buildAuthResponse(userId: string, phone: string, nickname: string, avatar?: string | null) {
    const accessToken = this.jwtService.sign({ sub: userId });
    return {
      accessToken,
      userInfo: {
        id: userId,
        phone,
        nickname,
        avatar
      }
    };
  }
}

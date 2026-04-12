import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from 'src/modules/auth/dtos/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserList() {
    return this.prisma.user.findMany({ orderBy: { createTime: 'desc' } });
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return user;
  }

  async getUserByPhone(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return user;
  }

  async createUser(user: RegisterDto) {
    const exist = await this.getUserByPhone(user.phone);

    if (exist) throw new BadRequestException('用户已存在');

    return this.prisma.user.create({ data: { ...user, nickname: user.nickname || `用户_${user.phone.slice(-4)}` } });
  }
}

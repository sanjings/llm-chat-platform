import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RegisterDto } from 'src/modules/auth/dtos/auth.dto';
import { PrismaService } from 'src/database/prisma.service';
import { resolveOffsetPagination } from 'src/common/pagination/offset-pagination.util';

const PUBLIC_USER_SELECT = {
  id: true,
  phone: true,
  email: true,
  nickname: true,
  avatar: true,
  createTime: true,
  updateTime: true
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhoneOptional(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async getUserByPhoneOrThrowForLogin(phone: string) {
    const user = await this.findByPhoneOptional(phone);
    if (!user) throw new BadRequestException('账号不存在');
    return user;
  }

  /** 对外展示：不含 password；avatar 为库中字段（可为 null，暂无上传逻辑） */
  async getPublicUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_USER_SELECT
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async listPaginated(pageNo?: number, pageSize?: number) {
    const { skip, take, pageNo: p, pageSize: s } = resolveOffsetPagination(pageNo, pageSize);
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createTime: 'desc' },
        select: PUBLIC_USER_SELECT
      }),
      this.prisma.user.count()
    ]);
    return { list, total, pageNo: p, pageSize: s };
  }

  async createUser(user: RegisterDto) {
    const exist = await this.findByPhoneOptional(user.phone);
    if (exist) throw new BadRequestException('用户已存在');

    const { avatar: _ignoredAvatar, ...rest } = user;

    return this.prisma.user.create({
      data: {
        ...rest,
        nickname: user.nickname || `用户_${user.phone.slice(-4)}`
      }
    });
  }
}

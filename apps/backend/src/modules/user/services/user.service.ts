import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatService } from 'src/modules/chat/services/chat.services';
import { resolveEffectiveModelId } from '../utils/default-model';
import { RegisterDto } from 'src/modules/auth/dtos/auth.dto';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { resolveOffsetPagination } from 'src/common/pagination/offset-pagination.util';
import { NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH } from 'src/common/validation/nickname';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService
  ) {}

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

    return this.prisma.user.create({
      data: {
        ...user,
        nickname: user.nickname || `用户_${user.phone.slice(-4)}`
      }
    });
  }

  async getDefaultModel(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultModelId: true }
    });
    if (!user) throw new NotFoundException('用户不存在');

    const models = this.chatService.listSelectableModels();
    return {
      defaultModelId: user.defaultModelId,
      effectiveModelId: resolveEffectiveModelId(user.defaultModelId, models, this.chatService.defaultModelId())
    };
  }

  async setDefaultModel(userId: string, defaultModelId: string) {
    const modelId = defaultModelId.trim();
    if (!modelId) throw new BadRequestException('默认模型不能为空');

    const models = this.chatService.listSelectableModels();
    const target = models.find((item) => item.id === modelId);
    if (!target) {
      throw new BadRequestException('该模型不在当前部署的可选列表中，不能设为默认');
    }
    if (!target.available) {
      throw new BadRequestException(target.unavailableReason?.trim() || '该模型当前不可用，不能设为默认');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    if (!user) throw new NotFoundException('用户不存在');

    await this.prisma.user.update({
      where: { id: userId },
      data: { defaultModelId: modelId }
    });

    return this.getDefaultModel(userId);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, phone: true }
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(userId: string, nickname: string) {
    const nextNickname = this.assertNickname(nickname);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    if (!user) throw new NotFoundException('用户不存在');

    await this.prisma.user.update({
      where: { id: userId },
      data: { nickname: nextNickname }
    });

    return this.getProfile(userId);
  }

  /** 与注册规则对齐：必填、2～20 个字符。更新时不走空昵称自动生成。 */
  private assertNickname(nickname: string) {
    if (typeof nickname !== 'string' || nickname.length === 0) {
      throw new BadRequestException('昵称不能为空');
    }
    if (nickname.length < NICKNAME_MIN_LENGTH || nickname.length > NICKNAME_MAX_LENGTH) {
      throw new BadRequestException(`昵称长度需为 ${NICKNAME_MIN_LENGTH}～${NICKNAME_MAX_LENGTH} 个字符`);
    }
    return nickname;
  }

  async getUserByIdWithPassword(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true }
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash }
    });
  }
}

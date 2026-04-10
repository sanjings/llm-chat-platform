import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { roleToLowerCase } from 'src/utils/role.utils';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async getList(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { updateTime: 'desc' },
      select: {
        id: true,
        title: true,
        createTime: true,
        updateTime: true
      }
    });
  }

  async findOne(id: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createTime: 'asc' }
        }
      }
    });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权访问该会话');
    return {
      ...session,
      messages: session.messages.map((msg) => ({
        ...msg,
        role: roleToLowerCase(msg.role)
      }))
    };
  }

  async createSession(userId: string, firstMsg?: string) {
    const title = (firstMsg || '新对话').trim().slice(0, 20) || '新对话';
    return this.prisma.session.create({ data: { title, userId } });
  }

  async updateTitle(id: string, userId: string, title: string) {
    await this.assertSessionOwner(id, userId);
    return this.prisma.session.update({
      where: { id },
      data: { title: title.trim().slice(0, 40) || '新对话' }
    });
  }

  async delete(id: string, userId: string) {
    await this.assertSessionOwner(id, userId);
    return this.prisma.session.delete({ where: { id } });
  }

  async existSession(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true }
    });
    return Boolean(session && session.userId === userId);
  }

  private async assertSessionOwner(sessionId: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true }
    });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权操作该会话');
  }
}

import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { roleToLowerCase } from 'src/utils/role.utils';
import { resolveOffsetPagination } from 'src/common/pagination/offset-pagination.util';
import {
  decodeMessageCursor,
  encodeMessageCursor,
  resolveMessagePageSize
} from 'src/common/pagination/message-cursor.util';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async getList(userId: string, pageNo?: number, pageSize?: number) {
    const { skip, take, pageNo: p, pageSize: s } = resolveOffsetPagination(pageNo, pageSize);
    const where = { userId };
    const [list, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        orderBy: { createTime: 'desc' },
        skip,
        take,
        select: {
          id: true,
          title: true,
          llmModelId: true,
          createTime: true,
          updateTime: true
        }
      }),
      this.prisma.session.count({ where })
    ]);
    return { list, total, pageNo: p, pageSize: s };
  }

  async findOne(id: string, userId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        userId: true,
        llmModelId: true,
        createTime: true,
        updateTime: true
      }
    });
    if (!session) throw new BadRequestException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权访问该会话');
    return session;
  }

  /**
   * 按时间倒序取「最新一页」，返回列表为时间正序（适合气泡展示）。
   * cursor 表示上一页中**最旧一条**消息，用于继续向更早翻页。
   */
  async listMessages(sessionId: string, userId: string, cursorRaw?: string, pageSize?: number) {
    await this.assertSessionOwner(sessionId, userId);
    const take = resolveMessagePageSize(pageSize);
    const decoded = decodeMessageCursor(cursorRaw);

    const where = {
      sessionId,
      ...(decoded && {
        OR: [
          { createTime: { lt: new Date(decoded.t) } },
          { AND: [{ createTime: new Date(decoded.t) }, { id: { lt: decoded.id } }] }
        ]
      })
    };

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: [{ createTime: 'desc' }, { id: 'desc' }],
      take: take + 1
    });

    const hasMore = rows.length > take;
    const slice = hasMore ? rows.slice(0, take) : rows;
    const chronological = slice.reverse().map((msg) => ({
      ...msg,
      role: roleToLowerCase(msg.role)
    }));

    const oldest = chronological[0];
    const nextCursor =
      hasMore && oldest
        ? encodeMessageCursor({
            id: oldest.id,
            t: oldest.createTime.toISOString()
          })
        : null;

    return {
      list: chronological,
      nextCursor,
      hasMore: Boolean(nextCursor),
      pageSize: take
    };
  }

  async createSession(userId: string, firstMsg?: string, llmModelId?: string) {
    const title = (firstMsg || '新对话').trim().slice(0, 20) || '新对话';
    const mid = llmModelId?.trim();
    return this.prisma.session.create({
      data: { title, userId, ...(mid ? { llmModelId: mid } : {}) }
    });
  }

  /** 流式对话前解析会话是否属于当前用户及其已绑定模型 */
  async findSessionForChat(userId: string, sessionId: string): Promise<{ llmModelId: string | null } | null> {
    const row = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { llmModelId: true }
    });
    return row ? { llmModelId: row.llmModelId } : null;
  }

  /** 旧数据或首条流式前：仅在尚未绑定时写入模型 */
  async setSessionLlmModelIdIfNull(sessionId: string, userId: string, llmModelId: string) {
    await this.assertSessionOwner(sessionId, userId);
    const v = llmModelId.trim();
    if (!v) return;
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, llmModelId: null },
      data: { llmModelId: v }
    });
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
    if (!session) throw new BadRequestException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权操作该会话');
  }
}

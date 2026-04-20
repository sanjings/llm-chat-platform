import { Controller, Post, Body, Get, Param, Delete, Query } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { SessionDto } from '../dtos/session.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';
import { MessageCursorQueryDto } from 'src/common/pagination/message-cursor.dto';
import {
  SessionDetailDto,
  SessionItemDto,
  SessionListResponseDto,
  SessionMessagesResponseDto
} from '../dtos/session-response.dto';

@Controller('session')
@ApiTags('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('list')
  @ApiOperation({ summary: '获取当前用户会话列表（分页）' })
  @ApiOkResponse({ description: 'list + total + pageNo + pageSize', type: SessionListResponseDto })
  async getSessionList(@CurrentUser() user: JwtPayload, @Query() query: PageQueryDto) {
    return this.sessionService.getList(user.sub, query.pageNo, query.pageSize);
  }

  @Get('messages/:sessionId')
  @ApiOperation({ summary: '会话消息（cursor 分页，从新到旧向更早翻页）' })
  @ApiOkResponse({ description: 'list + nextCursor + hasMore + pageSize', type: SessionMessagesResponseDto })
  async getSessionMessages(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: MessageCursorQueryDto
  ) {
    return this.sessionService.listMessages(sessionId, user.sub, query.cursor, query.pageSize);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: '获取会话详情（不含消息，消息请用 session/messages/:sessionId）' })
  @ApiOkResponse({ description: '会话详情', type: SessionDetailDto })
  async getSessionDetail(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionService.findOne(id, user.sub);
  }

  @Post('create')
  @ApiOperation({ summary: '创建会话' })
  @ApiOkResponse({ description: '创建成功', type: SessionItemDto })
  async createSession(@Body() body: { title?: string }, @CurrentUser() user: JwtPayload) {
    return this.sessionService.createSession(user.sub, body?.title);
  }

  @Post('title/update')
  @ApiOperation({ summary: '更新会话标题' })
  @ApiBody({ type: SessionDto })
  @ApiOkResponse({ description: '更新成功', type: SessionItemDto })
  async updateTitle(@Body() body: SessionDto, @CurrentUser() user: JwtPayload) {
    return this.sessionService.updateTitle(body.id, user.sub, body.title || '');
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: '删除会话' })
  @ApiOkResponse({ description: '删除成功', type: SessionItemDto })
  async deleteSession(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionService.delete(id, user.sub);
  }
}

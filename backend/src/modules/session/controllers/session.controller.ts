import { Controller, Post, Body, Get, Param, Patch, Delete } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { SessionDto } from '../dtos/session.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('session')
@ApiTags('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('list')
  @ApiOperation({ summary: '获取当前用户会话列表' })
  @ApiOkResponse({ description: '会话列表' })
  async getSessionList(@CurrentUser() user: JwtPayload) {
    return this.sessionService.getList(user.sub);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: '获取会话详情和消息历史' })
  @ApiOkResponse({ description: '会话详情' })
  async getSessionDetail(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionService.findOne(id, user.sub);
  }

  @Post('create')
  @ApiOperation({ summary: '创建会话' })
  @ApiBody({ type: SessionDto })
  @ApiOkResponse({ description: '创建成功' })
  async createSession(@Body() body: SessionDto, @CurrentUser() user: JwtPayload) {
    return this.sessionService.createSession(user.sub, body?.title);
  }

  @Patch('title/:id')
  @ApiOperation({ summary: '更新会话标题' })
  @ApiBody({ type: SessionDto })
  @ApiOkResponse({ description: '更新成功' })
  async updateTitle(@Param('id') id: string, @Body() body: SessionDto, @CurrentUser() user: JwtPayload) {
    return this.sessionService.updateTitle(id, user.sub, body.title || '');
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除会话' })
  @ApiOkResponse({ description: '删除成功' })
  async deleteSession(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionService.delete(id, user.sub);
  }
}

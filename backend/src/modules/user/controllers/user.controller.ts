import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UserService } from '../services/user.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';

@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiTags('user')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('list')
  @ApiOperation({ summary: '获取用户列表' })
  @ApiOkResponse({ description: '用户列表' })
  async getUserList() {
    return this.userService.getUserList();
  }

  @Get('info')
  @ApiOperation({ summary: '获取用户信息' })
  @ApiOkResponse({ description: '用户信息' })
  async getUserInfo(@Query('id') id: string, @Query('phone') phone: string) {
    return this.userService.getUserById(id) || this.userService.getUserByPhone(phone);
  }
}

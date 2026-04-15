import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';
import { UserInfoQueryDto } from '../dtos/user-query.dto';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('list')
  @ApiOperation({ summary: '用户列表（分页，无敏感字段；后续可加管理端权限）' })
  @ApiOkResponse({ description: 'list + total + pageNo + pageSize' })
  async list(@Query() query: PageQueryDto) {
    return this.userService.listPaginated(query.pageNo, query.pageSize);
  }

  @Get('info')
  @ApiOperation({ summary: '按 userId 查询用户资料（非仅当前登录人，便于后台管理扩展）' })
  @ApiOkResponse({ description: '用户信息' })
  async info(@Query() query: UserInfoQueryDto) {
    return this.userService.getPublicUserById(query.userId);
  }
}

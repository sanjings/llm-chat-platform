import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';
import { UserInfoQueryDto } from '../dtos/user-query.dto';
import { PublicUserDto, UserListResponseDto } from '../dtos/user-response.dto';
import { UpdateUserDefaultModelDto, UserDefaultModelDto } from '../dtos/user-default-model.dto';
import { CurrentUserProfileDto, UpdateCurrentUserProfileDto } from '../dtos/user-profile.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('list')
  @ApiOperation({ summary: '用户列表（分页，无敏感字段；后续可加管理端权限）' })
  @ApiOkResponse({ description: 'list + total + pageNo + pageSize', type: UserListResponseDto })
  async list(@Query() query: PageQueryDto) {
    return this.userService.listPaginated(query.pageNo, query.pageSize);
  }

  @Get('info')
  @ApiOperation({ summary: '按 userId 查询用户资料（非仅当前登录人，便于后台管理扩展）' })
  @ApiOkResponse({ description: '用户信息', type: PublicUserDto })
  async info(@Query() query: UserInfoQueryDto) {
    return this.userService.getPublicUserById(query.userId);
  }

  @Get('profile')
  @ApiOperation({ summary: '读取当前登录用户的账号资料（昵称可改，手机号只读）' })
  @ApiOkResponse({ type: CurrentUserProfileDto })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.userService.getProfile(user.sub);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新当前登录用户的昵称；仅针对当前登录账号，不接受他人 userId，也不能改手机号' })
  @ApiOkResponse({ type: CurrentUserProfileDto })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() body: UpdateCurrentUserProfileDto) {
    return this.userService.updateProfile(user.sub, body.nickname);
  }

  @Get('default-model')
  @ApiOperation({ summary: '当前登录用户的个人默认模型，以及按当前部署可用性计算的实际生效值' })
  @ApiOkResponse({ type: UserDefaultModelDto })
  async getDefaultModel(@CurrentUser() user: JwtPayload) {
    return this.userService.getDefaultModel(user.sub);
  }

  @Put('default-model')
  @ApiOperation({ summary: '保存当前登录用户的个人默认模型；仅允许设为当前部署中可用的模型' })
  @ApiOkResponse({ type: UserDefaultModelDto })
  async updateDefaultModel(@CurrentUser() user: JwtPayload, @Body() body: UpdateUserDefaultModelDto) {
    return this.userService.setDefaultModel(user.sub, body.defaultModelId);
  }
}

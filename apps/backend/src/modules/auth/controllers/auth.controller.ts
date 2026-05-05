import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from '../dtos/auth.dto';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SuccessMessage } from 'src/common/decorators/success-message.decorator';
import { AuthTokenResponseDto, EmptySuccessDto } from '../dtos/auth-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '手机号注册' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: '注册成功', type: EmptySuccessDto })
  @SuccessMessage('注册成功')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Public()
  @Post('registerLogin')
  @ApiOperation({ summary: '手机号注册并登录' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: '注册登录成功并返回 token', type: AuthTokenResponseDto })
  @SuccessMessage('注册登录成功')
  registerLogin(@Body() body: RegisterDto) {
    return this.authService.registerLogin(body);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '手机号登录' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: '登录成功并返回 token', type: AuthTokenResponseDto })
  @SuccessMessage('登录成功')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新令牌并换发 accessToken' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ description: '刷新成功并返回新 token', type: AuthTokenResponseDto })
  @SuccessMessage('刷新成功')
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @ApiOperation({ summary: '退出当前设备' })
  @ApiOkResponse({ description: '退出成功', type: EmptySuccessDto })
  @SuccessMessage('退出成功')
  logout(@CurrentUser() user: JwtPayload, @Headers('authorization') authorization?: string) {
    return this.authService.logout(user, authorization);
  }

  @Post('logoutAll')
  @ApiOperation({ summary: '退出全部设备' })
  @ApiOkResponse({ description: '全部退出成功', type: EmptySuccessDto })
  @SuccessMessage('全部退出成功')
  logoutAll(@CurrentUser() user: JwtPayload) {
    return this.authService.revokeAllSessions(user.sub);
  }
}

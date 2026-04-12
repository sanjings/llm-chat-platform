import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto } from '../dtos/auth.dto';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '手机号注册' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: '注册成功' })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('registerLogin')
  @ApiOperation({ summary: '手机号注册并登录' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: '注册登录成功并返回 token' })
  registerLogin(@Body() body: RegisterDto) {
    return this.authService.registerLogin(body);
  }

  @Post('login')
  @ApiOperation({ summary: '手机号登录' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: '登录成功并返回 token' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}

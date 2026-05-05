import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserInfoDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '13800138000' })
  phone: string;

  @ApiProperty({ example: '张三' })
  nickname: string;

  @ApiPropertyOptional({ type: String, nullable: true, description: '头像地址或 base64 字符串' })
  avatar: string | null;
}

export class AuthTokenResponseDto {
  @ApiProperty({ description: 'JWT 访问令牌（短有效期）' })
  accessToken: string;

  @ApiProperty({ description: 'JWT 刷新令牌（用于换发 accessToken）' })
  refreshToken: string;

  @ApiProperty({ description: 'accessToken 过期时间（秒）', example: 900 })
  accessTokenExpiresIn: number;

  @ApiProperty({ description: 'refreshToken 过期时间（秒）', example: 604800 })
  refreshTokenExpiresIn: number;

  @ApiProperty({ type: AuthUserInfoDto })
  userInfo: AuthUserInfoDto;
}

export class EmptySuccessDto {}

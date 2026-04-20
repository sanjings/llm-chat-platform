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
  @ApiProperty({ description: 'JWT 访问令牌' })
  accessToken: string;

  @ApiProperty({ type: AuthUserInfoDto })
  userInfo: AuthUserInfoDto;
}

export class EmptySuccessDto {}

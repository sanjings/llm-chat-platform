import { IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '13800138000' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString()
  @IsPhoneNumber('CN', { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ minLength: 6, maxLength: 32 })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password: string;

  @ApiProperty({ minLength: 2, maxLength: 20 })
  @IsNotEmpty({ message: '昵称不能为空' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;

  @ApiPropertyOptional({ description: '头像地址或 base64 字符串' })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class LoginDto {
  @ApiProperty({ example: '13800138000' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString()
  @IsPhoneNumber('CN', { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ minLength: 6, maxLength: 32 })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsNotEmpty({ message: 'refreshToken 不能为空' })
  @IsString()
  refreshToken: string;
}

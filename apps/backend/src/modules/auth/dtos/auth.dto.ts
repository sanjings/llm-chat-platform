import { IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NicknameField } from 'src/common/validation/nickname';
import { PasswordField } from 'src/common/validation/password';

export class RegisterDto {
  @ApiProperty({ example: '13800138000' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @IsString()
  @IsPhoneNumber('CN', { message: '手机号格式不正确' })
  phone: string;

  @PasswordField()
  password: string;

  @NicknameField()
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

  @PasswordField()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @IsNotEmpty({ message: 'refreshToken 不能为空' })
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @PasswordField()
  currentPassword: string;

  @PasswordField()
  newPassword: string;

  @PasswordField()
  confirmNewPassword: string;
}

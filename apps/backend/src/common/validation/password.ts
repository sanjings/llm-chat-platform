import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 32;

/** 与注册/登录接口相同的密码校验：必填字符串，长度 6～32，无字符集限制。 */
export const PasswordField = () =>
  applyDecorators(
    ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH }),
    IsNotEmpty({ message: '密码不能为空' }),
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `密码长度需为 ${PASSWORD_MIN_LENGTH}～${PASSWORD_MAX_LENGTH} 个字符`
    }),
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: `密码长度需为 ${PASSWORD_MIN_LENGTH}～${PASSWORD_MAX_LENGTH} 个字符`
    })
  );

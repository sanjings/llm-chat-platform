import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

/** 与注册接口相同的昵称校验：必填字符串，长度 2～20。 */
export const NicknameField = () =>
  applyDecorators(
    ApiProperty({ minLength: NICKNAME_MIN_LENGTH, maxLength: NICKNAME_MAX_LENGTH }),
    IsNotEmpty({ message: '昵称不能为空' }),
    IsString(),
    MinLength(NICKNAME_MIN_LENGTH),
    MaxLength(NICKNAME_MAX_LENGTH)
  );

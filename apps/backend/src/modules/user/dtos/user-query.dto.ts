import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UserInfoQueryDto {
  @ApiProperty({ description: '用户 id（UUID），后台管理可按需查询任意用户' })
  @IsNotEmpty({ message: 'userId 不能为空' })
  @IsUUID('4', { message: 'userId 须为 UUID' })
  userId: string;
}

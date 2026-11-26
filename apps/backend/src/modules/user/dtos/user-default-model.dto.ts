import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserDefaultModelDto {
  @ApiPropertyOptional({
    nullable: true,
    example: 'qwen3.7-plus',
    description: '当前账号已保存的个人默认模型；从未设置时为 null，即使该模型当前不可用也会原样返回'
  })
  defaultModelId: string | null;

  @ApiProperty({
    example: 'qwen3.7-plus',
    description: '新会话实际生效的模型：个人默认可用则用个人默认，否则回退到系统默认或第一个可用模型'
  })
  effectiveModelId: string;
}

export class UpdateUserDefaultModelDto {
  @ApiProperty({ example: 'qwen3.7-plus', description: '要保存的个人默认模型，必须是当前部署中可用的模型' })
  @IsNotEmpty({ message: '默认模型不能为空' })
  @IsString()
  defaultModelId: string;
}

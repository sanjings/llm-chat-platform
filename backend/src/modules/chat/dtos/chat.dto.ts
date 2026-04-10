import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_ROLES = ['user', 'assistant', 'system'] as const;

export class MessageDto {
  @ApiProperty({ enum: VALID_ROLES, example: 'user' })
  @IsIn(VALID_ROLES)
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ example: '你好' })
  @IsString()
  content: string;
}

export class ChatDto {
  @ApiProperty({ type: [MessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @ApiPropertyOptional({ example: 'session-id' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  /** v2 多模型切换时由前端传入；v1 可省略，使用 LLM_MODEL */
  @ApiPropertyOptional({ example: 'qwen-max' })
  @IsOptional()
  @IsString()
  modelId?: string;
}

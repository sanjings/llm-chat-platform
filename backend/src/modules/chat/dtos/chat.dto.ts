import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MESSAGE_ROLE_WIRE, type MessageRoleWire } from 'src/constants/role.const';

export const RESPONSE_FORMAT_WIRE = ['text', 'markdown'] as const;
export type ResponseFormatWire = (typeof RESPONSE_FORMAT_WIRE)[number];

export class MessageDto {
  @ApiProperty({ enum: MESSAGE_ROLE_WIRE, example: 'user' })
  @IsNotEmpty({ message: '角色不能为空' })
  @IsIn(MESSAGE_ROLE_WIRE, { message: '角色须为 user / assistant / system' })
  role: MessageRoleWire;

  @ApiProperty({ example: '你好' })
  @IsNotEmpty({ message: '内容不能为空' })
  @IsString()
  content: string;
}

export class ChatDto {
  @ApiProperty({ type: [MessageDto] })
  @IsNotEmpty({ message: '消息不能为空' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @ApiPropertyOptional({ example: 'session-id' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  /**
   * 多模型：传模型名或线路标识；命中后端映射则决定走 DashScope 还是 OpenAI 兼容网关。
   * 已有 sessionId 且会话已绑定 llmModelId 时以库为准；若再传且与绑定不一致则 400。
   */
  @ApiPropertyOptional({ example: 'qwen-max' })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional({ enum: RESPONSE_FORMAT_WIRE, example: 'markdown' })
  @IsOptional()
  @IsIn(RESPONSE_FORMAT_WIRE, { message: 'responseFormat 须为 text / markdown' })
  responseFormat?: ResponseFormatWire;
}

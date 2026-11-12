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
   * 多模型：传模型名或线路标识；命中当前部署的可选列表、正式目录、旧别名，或 qwen* / deepseek* 前缀则决定线路。
   * 已有 sessionId 且会话已绑定 llmModelId 时以库为准；若再传且与绑定不一致则 400。
   * 绑定模型即使已不在可选列表中，后续消息仍使用该模型。
   */
  @ApiPropertyOptional({ example: 'qwen3.7-plus' })
  @IsOptional()
  @IsString()
  modelId?: string;

  @ApiPropertyOptional({ enum: RESPONSE_FORMAT_WIRE, example: 'markdown' })
  @IsOptional()
  @IsIn(RESPONSE_FORMAT_WIRE, { message: 'responseFormat 须为 text / markdown' })
  responseFormat?: ResponseFormatWire;
}

export class ChatModelOptionDto {
  @ApiProperty({ example: 'qwen3.7-plus', description: '上游官方模型 ID' })
  id: string;

  @ApiProperty({ enum: ['dashscope', 'openai_compatible'] })
  provider: 'dashscope' | 'openai_compatible';

  @ApiProperty({ description: '对应厂商 API Key 已配置时为 true' })
  available: boolean;

  @ApiPropertyOptional({ nullable: true, example: '未配置 DeepSeek API Key，DeepSeek 模型不可选' })
  unavailableReason: string | null;
}

export class ChatModelListDto {
  @ApiProperty({ type: [ChatModelOptionDto] })
  models: ChatModelOptionDto[];

  @ApiProperty({
    example: 'qwen3.7-plus',
    description: '未传 modelId 时使用的模型，与 LLM_MODEL 相同。未配置 LLM_MODEL 时为当前 LLM_PROVIDER 的内置默认模型'
  })
  defaultModelId: string;
}

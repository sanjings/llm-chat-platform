import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/pagination/page-response.dto';

export class SessionItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createTime: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updateTime: Date;
}

export class SessionDetailDto extends SessionItemDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;
}

export class SessionMessageDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ format: 'uuid' })
  sessionId: string;

  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  role: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createTime: Date;
}

export class SessionListResponseDto extends PageMetaDto {
  @ApiProperty({ type: [SessionItemDto] })
  list: SessionItemDto[];
}

export class SessionMessagesResponseDto {
  @ApiProperty({ type: [SessionMessageDto] })
  list: SessionMessageDto[];

  @ApiPropertyOptional({ nullable: true, example: 'eyJpZCI6MSwidCI6IjIwMjYtMDQtMjBUMDk6MDA6MDAuMDAwWiJ9' })
  nextCursor: string | null;

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

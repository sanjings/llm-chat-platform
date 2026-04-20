import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/** 分页公共参数：每页数量 */
export class PageSizeQueryDto {
  @ApiPropertyOptional({ description: '每页数量', example: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

/** Offset 分页公共参数：页码 + 每页数量 */
export class OffsetPageQueryDto extends PageSizeQueryDto {
  @ApiPropertyOptional({ description: '页码，从 1 开始', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo?: number;
}

/** Cursor 分页公共参数：游标 + 每页数量 */
export class CursorPageQueryDto extends PageSizeQueryDto {
  @ApiPropertyOptional({
    description: '游标，表示上一页最旧消息位置',
    example: 'eyJpZCI6MSwidCI6IjIwMjYtMDQtMjBUMDk6MDA6MDAuMDAwWiJ9'
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

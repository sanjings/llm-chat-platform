import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Offset 分页查询（pageNo + pageSize） */
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

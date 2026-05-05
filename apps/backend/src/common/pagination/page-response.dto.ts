import { ApiProperty } from '@nestjs/swagger';

export class PageMetaDto {
  @ApiProperty({ type: Number, example: 100 })
  total: number;

  @ApiProperty({ type: Number, example: 1 })
  pageNo: number;

  @ApiProperty({ type: Number, example: 20 })
  pageSize: number;
}

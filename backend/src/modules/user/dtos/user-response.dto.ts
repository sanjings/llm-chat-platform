import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/pagination/page-response.dto';

export class PublicUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiProperty()
  nickname: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatar: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createTime: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updateTime: Date;
}

export class UserListResponseDto extends PageMetaDto {
  @ApiProperty({ type: [PublicUserDto] })
  list: PublicUserDto[];
}

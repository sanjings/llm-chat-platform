import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SessionDto {
  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(40)
  title: string;
}

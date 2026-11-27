import { ApiProperty } from '@nestjs/swagger';
import { NicknameField } from 'src/common/validation/nickname';

export class CurrentUserProfileDto {
  @ApiProperty()
  nickname: string;

  @ApiProperty({ example: '13800138000' })
  phone: string;
}

export class UpdateCurrentUserProfileDto {
  @NicknameField()
  nickname: string;
}

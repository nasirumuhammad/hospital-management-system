import { IsEnum, IsUUID } from 'class-validator';
import { ProfileType } from '../../common/enums/profile-type.enum';

export class LinkProfileDto {
  @IsUUID() userId: string;
  @IsEnum(ProfileType) profileType: ProfileType;
  @IsUUID() profileId: string;
}

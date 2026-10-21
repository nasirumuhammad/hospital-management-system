import { IsEnum, IsUUID } from 'class-validator';
import { ProfileType } from '../../common/enums/profile-type.enum';

export class CreateProfileAccountDto {
  @IsEnum(ProfileType) profileType: ProfileType;
  @IsUUID() profileId: string;
}

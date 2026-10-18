import { BadRequestException, Injectable } from '@nestjs/common';
import { ProfileType } from '../common/enums/profile-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { LinkProfileDto } from './dto/link-profile.dto';
import { UsersService } from './users.service';

const ROLE_FOR_PROFILE: Record<ProfileType, UserRole> = {
  [ProfileType.PATIENT]: UserRole.PATIENT,
  [ProfileType.DOCTOR]: UserRole.DOCTOR,
};

@Injectable()
export class ProfileLinkService {
  constructor(
    private readonly users: UsersService,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
  ) {}

  async link(dto: LinkProfileDto, actor: AuthenticatedUser) {
    const user = await this.users.getByIdOrFail(dto.userId);
    if (user.role !== ROLE_FOR_PROFILE[dto.profileType]) {
      throw new BadRequestException('Account role must match the profile type');
    }
    return dto.profileType === ProfileType.PATIENT
      ? this.patients.linkUser(dto.profileId, user.id, actor)
      : this.doctors.linkUser(dto.profileId, user.id, actor);
  }
}

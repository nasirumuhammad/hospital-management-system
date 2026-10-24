import { BadRequestException, Injectable } from '@nestjs/common';
import { ProfileType } from '../common/enums/profile-type.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { StaffService } from '../staff/staff.service';
import { LinkProfileDto } from './dto/link-profile.dto';
import { FIXED_ROLE_FOR_PROFILE } from './profile-role.constants';
import { UsersService } from './users.service';

@Injectable()
export class ProfileLinkService {
  constructor(
    private readonly users: UsersService,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly staff: StaffService,
  ) {}

  async link(dto: LinkProfileDto, actor: AuthenticatedUser) {
    const user = await this.users.getByIdOrFail(dto.userId);
    if (!actor.hospitalId || user.hospitalId !== actor.hospitalId) {
      throw new BadRequestException('Account and profile must belong to the same hospital');
    }
    if (dto.profileType === ProfileType.STAFF) {
      const member = await this.staff.findOrFail(dto.profileId, actor);
      if (user.role !== member.role) throw new BadRequestException('Account role must match the staff member\'s role');
      return this.staff.linkUser(dto.profileId, user.id, actor);
    }
    if (user.role !== FIXED_ROLE_FOR_PROFILE[dto.profileType]) {
      throw new BadRequestException('Account role must match the profile type');
    }
    return dto.profileType === ProfileType.PATIENT
      ? this.patients.linkUser(dto.profileId, user.id, actor)
      : this.doctors.linkUser(dto.profileId, user.id, actor);
  }
}

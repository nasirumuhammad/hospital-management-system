import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ProfileType } from '../common/enums/profile-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { StaffService } from '../staff/staff.service';
import { STAFF_ROLES } from '../staff/staff-roles';
import { CreateProfileAccountDto } from './dto/create-profile-account.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ProfileLinkService } from './profile-link.service';
import { FIXED_ROLE_FOR_PROFILE } from './profile-role.constants';
import { UserResponse } from './user.mapper';
import { UsersService } from './users.service';

const ACCOUNT_NAME_MAX_LENGTH = 100;

interface ProfileIdentity {
  firstName: string;
  lastName: string;
  email: string | null;
  userId: string | null;
  role?: UserRole;
}

/** Gives an existing patient, doctor or staff record a login: creates the account, e-mails an invitation and links it. */
@Injectable()
export class ProfileAccountService {
  constructor(
    private readonly users: UsersService,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly staff: StaffService,
    private readonly profileLinks: ProfileLinkService,
  ) {}

  async createLogin(dto: CreateProfileAccountDto, actor: AuthenticatedUser): Promise<UserResponse> {
    const profile = await this.findProfile(dto, actor);
    if (profile.userId) throw new ConflictException('This profile already has a login');
    if (!profile.email) throw new BadRequestException('Add an email address to this profile before creating a login');
    const role = profile.role ?? FIXED_ROLE_FOR_PROFILE[dto.profileType];
    if (!role) throw new BadRequestException('This profile type cannot have a login');
    const account = await this.users.create({ email: profile.email, name: this.accountName(profile), role }, actor);
    await this.profileLinks.link({ userId: account.id, profileType: dto.profileType, profileId: dto.profileId }, actor);
    return account;
  }

  /** Creates a standalone account; staff roles also get their person record so the two are never out of step. */
  async createAccount(dto: CreateUserDto, actor: AuthenticatedUser): Promise<UserResponse> {
    const account = await this.users.create(dto, actor);
    if (STAFF_ROLES.includes(account.role)) await this.staff.createForAccount(account, actor);
    return account;
  }

  private findProfile(dto: CreateProfileAccountDto, actor: AuthenticatedUser): Promise<ProfileIdentity> {
    switch (dto.profileType) {
      case ProfileType.PATIENT: return this.patients.findOrFail(dto.profileId, actor);
      case ProfileType.DOCTOR: return this.doctors.findOrFail(dto.profileId, actor);
      default: return this.staff.findOrFail(dto.profileId, actor);
    }
  }

  private accountName(profile: ProfileIdentity): string {
    return `${profile.firstName} ${profile.lastName}`.slice(0, ACCOUNT_NAME_MAX_LENGTH);
  }
}

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ProfileType } from '../common/enums/profile-type.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { CreateProfileAccountDto } from './dto/create-profile-account.dto';
import { ProfileLinkService } from './profile-link.service';
import { ROLE_FOR_PROFILE } from './profile-role.constants';
import { UserResponse } from './user.mapper';
import { UsersService } from './users.service';

const ACCOUNT_NAME_MAX_LENGTH = 100;

interface ProfileIdentity {
  firstName: string;
  lastName: string;
  email: string | null;
  userId: string | null;
}

/** Gives an existing patient or doctor record a login: creates the account, e-mails an invitation and links it. */
@Injectable()
export class ProfileAccountService {
  constructor(
    private readonly users: UsersService,
    private readonly patients: PatientsService,
    private readonly doctors: DoctorsService,
    private readonly profileLinks: ProfileLinkService,
  ) {}

  async createLogin(dto: CreateProfileAccountDto, actor: AuthenticatedUser): Promise<UserResponse> {
    const profile = await this.findProfile(dto, actor);
    if (profile.userId) throw new ConflictException('This profile already has a login');
    if (!profile.email) throw new BadRequestException('Add an email address to this profile before creating a login');
    const account = await this.users.create(
      { email: profile.email, name: this.accountName(profile), role: ROLE_FOR_PROFILE[dto.profileType] },
      actor,
    );
    await this.profileLinks.link({ userId: account.id, profileType: dto.profileType, profileId: dto.profileId }, actor);
    return account;
  }

  private findProfile(dto: CreateProfileAccountDto, actor: AuthenticatedUser): Promise<ProfileIdentity> {
    return dto.profileType === ProfileType.PATIENT ? this.patients.findOrFail(dto.profileId, actor) : this.doctors.findOrFail(dto.profileId, actor);
  }

  private accountName(profile: ProfileIdentity): string {
    return `${profile.firstName} ${profile.lastName}`.slice(0, ACCOUNT_NAME_MAX_LENGTH);
  }
}

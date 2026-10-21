import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { PasswordService } from '../users/password.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { User } from '../users/entities/user.entity';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { Hospital } from './entities/hospital.entity';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectRepository(Hospital) private readonly hospitals: Repository<Hospital>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.hospitals.find({ order: { createdAt: 'DESC' } });
  }

  async findOrFail(id: string): Promise<Hospital> {
    const hospital = await this.hospitals.findOneBy({ id });
    if (!hospital) throw new NotFoundException('Hospital not found');
    return hospital;
  }

  async create(dto: CreateHospitalDto, actor: AuthenticatedUser): Promise<{ hospital: Hospital; administrator: { id: string; email: string; name: string } }> {
    const email = dto.adminEmail.trim().toLowerCase();
    const duplicate = await this.dataSource.getRepository(User).findOneBy({ email });
    if (duplicate) throw new ConflictException('An account with this email already exists');
    const passwordHash = await this.passwords.hash(dto.adminPassword);
    try {
      const created = await this.dataSource.transaction(async (manager) => {
        const hospitalRepo = manager.getRepository(Hospital);
        const userRepo = manager.getRepository(User);
        const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Africa/Lagos', year: 'numeric' }).format(new Date()));
        const hospital = await hospitalRepo.save(hospitalRepo.create({
          name: dto.name.trim(), slug: dto.slug.trim().toLowerCase(), phone: dto.phone?.trim() || null,
          address: dto.address?.trim() || null, patientNumberPrefix: dto.patientNumberPrefix,
          patientNumberYear: year, nextPatientNumber: 1, lastVisitNumber: 0, isActive: true,
        }));
        const administrator = await userRepo.save(userRepo.create({
          hospitalId: hospital.id, email, name: dto.adminName.trim(), role: UserRole.ADMIN,
          passwordHash, isActive: true, tokenVersion: 0, emailVerifiedAt: new Date(),
        }));
        return { hospital, administrator: { id: administrator.id, email: administrator.email, name: administrator.name } };
      });
      await this.audit.recordPlatform({ actorId: actor.id, action: AuditAction.HOSPITAL_CREATED, targetType: AuditTarget.HOSPITAL, targetId: created.hospital.id, metadata: { slug: created.hospital.slug, administratorId: created.administrator.id } });
      return created;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505') {
        throw new ConflictException('Hospital slug or administrator email already exists');
      }
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean, actor: AuthenticatedUser): Promise<Hospital> {
    const hospital = await this.findOrFail(id);
    hospital.isActive = isActive;
    const saved = await this.hospitals.save(hospital);
    await this.audit.recordPlatform({ actorId: actor.id, action: isActive ? AuditAction.HOSPITAL_ACTIVATED : AuditAction.HOSPITAL_SUSPENDED, targetType: AuditTarget.HOSPITAL, targetId: id });
    return saved;
  }
}

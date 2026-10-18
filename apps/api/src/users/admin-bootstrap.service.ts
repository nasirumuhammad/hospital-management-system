import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../common/enums/user-role.enum';
import { EnvironmentVariables } from '../config/env.validation';
import { PasswordService } from './password.service';
import { UsersRepository } from './users.repository';

const DEFAULT_ADMIN_NAME = 'System Administrator';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly repository: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get('ADMIN_EMAIL', { infer: true })?.toLowerCase().trim();
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    if (!email || !password || (await this.repository.existsByEmail(email))) return;
    await this.repository.create({
      email,
      name: this.config.get('ADMIN_NAME', { infer: true }) ?? DEFAULT_ADMIN_NAME,
      role: UserRole.ADMIN,
      passwordHash: await this.passwords.hash(password),
      emailVerifiedAt: new Date(),
    });
    this.logger.log('Bootstrap administrator account created; remove ADMIN_* variables from the runtime environment');
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsModule } from '../doctors/doctors.module';
import { MailModule } from '../mail/mail.module';
import { PatientsModule } from '../patients/patients.module';
import { AccountNotificationsService } from './account-notifications.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { User } from './entities/user.entity';
import { UserToken } from './entities/user-token.entity';
import { PasswordService } from './password.service';
import { ProfileAccountService } from './profile-account.service';
import { ProfileLinkService } from './profile-link.service';
import { UserTokensRepository } from './user-tokens.repository';
import { UserTokensService } from './user-tokens.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserToken]), MailModule, PatientsModule, DoctorsModule],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    UsersService,
    PasswordService,
    UserTokensRepository,
    UserTokensService,
    AccountNotificationsService,
    ProfileLinkService,
    ProfileAccountService,
    AdminBootstrapService,
  ],
  exports: [UsersService, PasswordService, UserTokensService, AccountNotificationsService],
})
export class UsersModule {}

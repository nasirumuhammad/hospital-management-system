import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ACCESS_TOKEN_ISSUER, JWT_ALGORITHM } from '../common/constants/auth.constants';
import { EnvironmentVariables } from '../config/env.validation';
import { UsersModule } from '../users/users.module';
import { Hospital } from '../hospitals/entities/hospital.entity';
import { AccessTokenService } from './access-token.service';
import { AuthCookieService } from './auth-cookie.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { SessionService } from './session.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([RefreshToken, Hospital]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: JWT_ALGORITHM,
          issuer: ACCESS_TOKEN_ISSUER,
          expiresIn: config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RefreshTokensRepository,
    AccessTokenService,
    SessionService,
    AuthCookieService,
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}

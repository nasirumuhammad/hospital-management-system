import { Module, RequestMethod } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { LoggerModule } from "nestjs-pino";
import { AppointmentsModule } from "./appointments/appointments.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { DEFAULT_THROTTLE } from "./common/constants/auth.constants";
import { EnvironmentVariables, validateEnv } from "./config/env.validation";
import { DashboardModule } from "./dashboard/dashboard.module";
import { buildDatabaseOptions } from "./database/database-options";
import { DoctorsModule } from "./doctors/doctors.module";
import { HealthController } from "./health/health.controller";
import { HospitalsModule } from "./hospitals/hospitals.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { MedicalRecordsModule } from "./medical-records/medical-records.module";
import { PatientsModule } from "./patients/patients.module";
import { PrescriptionsModule } from "./prescriptions/prescriptions.module";
import { OperationsModule } from "./operations/operations.module";
import { UsersModule } from "./users/users.module";

const HTTP_ERROR_STATUS = 400;
const SERVER_ERROR_STATUS = 500;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        // nestjs-pino defaults to "*", which Nest 11 / Express 5 rewrites to the legacy "/api/*"
        // and warns about on every start. "{*splat}" is the Express 5 spelling of "match everything".
        forRoutes: [{ path: "{*splat}", method: RequestMethod.ALL }],
        pinoHttp: {
          level: config.get("LOG_LEVEL", { infer: true }),
          genReqId: (_request, response) => {
            const id = randomUUID();
            response.setHeader("X-Request-Id", id);
            return id;
          },
          customLogLevel: (_request, response, error) => {
            if (error || response.statusCode >= SERVER_ERROR_STATUS)
              return "error";
            return response.statusCode >= HTTP_ERROR_STATUS ? "warn" : "silent";
          },
          serializers: {
            req: (request: { id: string; method: string; url: string }) => ({
              id: request.id,
              method: request.method,
              url: request.url.split("?")[0],
            }),
            res: (response: { statusCode: number }) => ({
              statusCode: response.statusCode,
            }),
          },
          transport:
            config.get("NODE_ENV", { infer: true }) === "development"
              ? { target: "pino-pretty" }
              : undefined,
        },
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ...DEFAULT_THROTTLE }],
      skipIf: () => process.env.NODE_ENV === "test",
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        ...buildDatabaseOptions({
          DATABASE_URL: config.get("DATABASE_URL", { infer: true }),
          DATABASE_SSL: config.get("DATABASE_SSL", { infer: true }),
        }),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    AuditModule,
    UsersModule,
    AuthModule,
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    PrescriptionsModule,
    InvoicesModule,
    DashboardModule,
    HospitalsModule,
    OperationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

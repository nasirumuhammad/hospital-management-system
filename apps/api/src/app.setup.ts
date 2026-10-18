import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { csrfOriginCheck } from './common/middleware/csrf-origin.middleware';
import { noStore } from './common/middleware/no-store.middleware';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { EnvironmentVariables } from './config/env.validation';

const CORS_MAX_AGE_SECONDS = 600;

export function parseOrigins(value: string): string[] {
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const origins = parseOrigins(config.get('WEB_ORIGIN', { infer: true }));
  const trustProxy = config.get('TRUST_PROXY', { infer: true });
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: CORS_MAX_AGE_SECONDS,
  });
  app.use(noStore);
  app.use(csrfOriginCheck(origins));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new DatabaseExceptionFilter());
  app.enableShutdownHooks();
}

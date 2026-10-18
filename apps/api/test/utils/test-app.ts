import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import dataSource from '../../src/database/data-source';
import { MailService } from '../../src/mail/mail.service';
import { FakeMailService } from './fake-mail.service';

export const WEB_ORIGIN = 'http://localhost:3000';
export const ADMIN = { email: 'admin@example.com', password: 'Admin-Password-12345' };
export const STRONG_PASSWORD = 'Correct-Horse-Battery-9';

export interface TestContext {
  app: NestExpressApplication;
  mail: FakeMailService;
}

async function resetDatabase(): Promise<void> {
  await dataSource.initialize();
  await dataSource.dropDatabase();
  await dataSource.runMigrations();
  await dataSource.destroy();
}

export async function createTestApp(): Promise<TestContext> {
  await resetDatabase();
  const mail = new FakeMailService();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return { app, mail };
}

export function newAgent(app: NestExpressApplication) {
  return request.agent(app.getHttpServer()).set('Origin', WEB_ORIGIN);
}

export async function loginAgent(app: NestExpressApplication, email: string, password: string) {
  const agent = newAgent(app);
  const response = await agent.post('/api/auth/login').send({ email, password });
  if (response.status !== 200) throw new Error(`Login failed for ${email}: ${response.status}`);
  return agent;
}

export function cookieValue(response: request.Response, name: string): string | undefined {
  const cookies = (response.headers['set-cookie'] ?? []) as unknown as string[];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match?.split(';')[0].slice(name.length + 1);
}

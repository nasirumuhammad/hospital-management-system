import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { RESEND_CLIENT } from '../common/constants/mail.constants';
import { EnvironmentVariables } from '../config/env.validation';
import { MailService } from './mail.service';

@Module({
  providers: [
    MailService,
    {
      provide: RESEND_CLIENT,
      inject: [ConfigService],
      // No client in console mode; env validation guarantees the key when MAIL_TRANSPORT=resend.
      useFactory: (config: ConfigService<EnvironmentVariables, true>): Resend | null =>
        config.get('MAIL_TRANSPORT', { infer: true }) === 'resend'
          ? new Resend(config.get('RESEND_API_KEY', { infer: true }))
          : null,
    },
  ],
  exports: [MailService],
})
export class MailModule {}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from '../common/constants/auth.constants';
import { EnvironmentVariables } from '../config/env.validation';
import { ActionLinkMail, MailMessage } from './mail.types';
import { renderActionLinkMail } from './templates/action-link.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter;
  private readonly from: string;
  private readonly isConsoleTransport: boolean;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });
    this.isConsoleTransport = config.get('MAIL_TRANSPORT', { infer: true }) === 'console';
    this.transport = this.isConsoleTransport
      ? createTransport({ jsonTransport: true })
      : createTransport({
          host: config.get('SMTP_HOST', { infer: true }),
          port: config.get('SMTP_PORT', { infer: true }),
          secure: config.get('SMTP_SECURE', { infer: true }),
          auth: this.smtpAuth(config),
        });
  }

  async sendPasswordReset(mail: ActionLinkMail): Promise<void> {
    await this.deliver(renderActionLinkMail({
      ...mail,
      subject: 'Reset your CarePoint password',
      intro: `Use the link below to choose a new password. It expires in ${PASSWORD_RESET_TTL_MINUTES} minutes and can be used once.`,
      buttonLabel: 'Reset password',
      footnote: 'If you did not request this, you can ignore this email; your password will not change.',
    }));
  }

  async sendEmailVerification(mail: ActionLinkMail): Promise<void> {
    await this.deliver(renderActionLinkMail({
      ...mail,
      subject: 'Verify your CarePoint email address',
      intro: `Confirm your email address using the link below. It expires in ${EMAIL_VERIFICATION_TTL_HOURS} hours.`,
      buttonLabel: 'Verify email address',
      footnote: 'If you were not expecting this, you can ignore this email.',
    }));
  }

  private async deliver(message: MailMessage): Promise<void> {
    try {
      await this.transport.sendMail({ from: this.from, ...message });
      if (this.isConsoleTransport) this.logger.log(`Console mail transport (development only):\n${message.text}`);
    } catch (error) {
      const failure = error as { name?: string; code?: string };
      this.logger.error(`Email delivery failed (${failure.name ?? 'Error'} ${failure.code ?? ''})`.trim());
    }
  }

  private smtpAuth(config: ConfigService<EnvironmentVariables, true>) {
    const user = config.get('SMTP_USER', { infer: true });
    const pass = config.get('SMTP_PASSWORD', { infer: true });
    return user && pass ? { user, pass } : undefined;
  }
}

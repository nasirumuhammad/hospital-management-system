import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { ACCOUNT_INVITATION_TTL_HOURS, EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from '../common/constants/auth.constants';
import { RESEND_CLIENT } from '../common/constants/mail.constants';
import { EnvironmentVariables } from '../config/env.validation';
import { ActionLinkMail, MailMessage } from './mail.types';
import { renderActionLinkMail } from './templates/action-link.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;

  constructor(
    @Inject(RESEND_CLIENT) private readonly resend: Resend | null,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.from = config.get('MAIL_FROM', { infer: true });
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

  async sendAccountInvitation(mail: ActionLinkMail): Promise<void> {
    await this.deliver(renderActionLinkMail({
      ...mail,
      subject: 'You have been invited to CarePoint',
      intro: `An administrator created a CarePoint account for you. Use the link below to choose your password. It expires in ${ACCOUNT_INVITATION_TTL_HOURS} hours and can be used once.`,
      buttonLabel: 'Set your password',
      footnote: 'If you were not expecting this, you can ignore this email; no one can sign in to the account until a password is set.',
    }));
  }

  // Delivery failures are logged, never thrown: callers (forgot-password) must respond identically
  // whether or not an account exists, so a provider error cannot surface to the client.
  private async deliver(message: MailMessage): Promise<void> {
    if (!this.resend) return this.logConsoleMail(message);
    try {
      const { error } = await this.resend.emails.send({ from: this.from, ...message });
      if (error) this.logger.error(`Email delivery failed (${error.name})`);
    } catch (failure) {
      this.logger.error(`Email delivery failed (${failure instanceof Error ? failure.name : 'Error'})`);
    }
  }

  private logConsoleMail(message: MailMessage): void {
    this.logger.log(`Console mail transport (development only):\n${message.text}`);
  }
}

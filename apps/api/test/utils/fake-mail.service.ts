import { ActionLinkMail } from '../../src/mail/mail.types';

export type SentMail = ActionLinkMail & { kind: 'password-reset' | 'email-verification' };

export class FakeMailService {
  readonly sent: SentMail[] = [];

  async sendPasswordReset(mail: ActionLinkMail): Promise<void> {
    this.sent.push({ ...mail, kind: 'password-reset' });
  }

  async sendEmailVerification(mail: ActionLinkMail): Promise<void> {
    this.sent.push({ ...mail, kind: 'email-verification' });
  }

  tokenFor(to: string, kind: SentMail['kind']): string {
    const mail = [...this.sent].reverse().find((entry) => entry.to === to && entry.kind === kind);
    if (!mail) throw new Error(`No ${kind} mail sent to ${to}`);
    return new URL(mail.link).searchParams.get('token') as string;
  }
}

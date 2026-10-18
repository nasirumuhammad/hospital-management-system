import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserTokenType } from '../common/enums/user-token-type.enum';
import { EnvironmentVariables } from '../config/env.validation';
import { MailService } from '../mail/mail.service';
import { User } from './entities/user.entity';
import { USER_TOKEN_LINK_PATH } from './user-token.constants';
import { UserTokensService } from './user-tokens.service';

type Recipient = Pick<User, 'id' | 'email' | 'name'>;

@Injectable()
export class AccountNotificationsService {
  private readonly webUrl: string;

  constructor(
    private readonly tokens: UserTokensService,
    private readonly mail: MailService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.webUrl = config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
  }

  async sendEmailVerification(user: Recipient): Promise<void> {
    const link = await this.linkFor(user, UserTokenType.EMAIL_VERIFICATION);
    void this.mail.sendEmailVerification({ to: user.email, name: user.name, link });
  }

  async sendPasswordReset(user: Recipient): Promise<void> {
    const link = await this.linkFor(user, UserTokenType.PASSWORD_RESET);
    void this.mail.sendPasswordReset({ to: user.email, name: user.name, link });
  }

  private async linkFor(user: Recipient, type: UserTokenType): Promise<string> {
    const token = await this.tokens.issue(user.id, type);
    return `${this.webUrl}/${USER_TOKEN_LINK_PATH[type]}?token=${encodeURIComponent(token)}`;
  }
}

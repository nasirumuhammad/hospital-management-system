import { ConfigService } from '@nestjs/config';
import type { Resend } from 'resend';
import { MailService } from './mail.service';

const FROM = 'CarePoint <no-reply@carepoint.test>';
const MAIL = { to: 'pat@example.com', name: 'Pat', link: 'https://app.example.com/reset-password?token=abc' };

function build(resend: Resend | null) {
  const config = { get: () => FROM } as unknown as ConfigService<never, true>;
  return new MailService(resend, config);
}

function fakeResend(result: unknown) {
  const send = jest.fn().mockImplementation(() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)));
  return { client: { emails: { send } } as unknown as Resend, send };
}

describe('MailService', () => {
  it('sends the rendered message through Resend from the configured sender', async () => {
    const { client, send } = fakeResend({ data: { id: '1' }, error: null });
    await build(client).sendPasswordReset(MAIL);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: FROM, to: MAIL.to, subject: 'Reset your CarePoint password' }));
  });

  it('does not throw when Resend reports an error, so recovery responses stay identical', async () => {
    const { client } = fakeResend({ data: null, error: { name: 'validation_error', message: 'bad' } });
    await expect(build(client).sendEmailVerification(MAIL)).resolves.toBeUndefined();
  });

  it('does not throw when the request itself fails', async () => {
    const { client } = fakeResend(new Error('network down'));
    await expect(build(client).sendPasswordReset(MAIL)).resolves.toBeUndefined();
  });

  it('only logs in console mode and never calls a provider', async () => {
    await expect(build(null).sendPasswordReset(MAIL)).resolves.toBeUndefined();
  });
});

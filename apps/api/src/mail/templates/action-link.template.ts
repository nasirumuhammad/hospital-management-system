import { MailMessage } from '../mail.types';
import { escapeHtml } from './escape-html';

interface ActionLinkTemplate {
  to: string;
  name: string;
  link: string;
  subject: string;
  intro: string;
  buttonLabel: string;
  footnote: string;
}

export function renderActionLinkMail(template: ActionLinkTemplate): MailMessage {
  const text = `Hello ${template.name},\n\n${template.intro}\n\n${template.link}\n\n${template.footnote}\n\nCarePoint`;
  const html = `<p>Hello ${escapeHtml(template.name)},</p><p>${escapeHtml(template.intro)}</p>`
    + `<p><a href="${escapeHtml(template.link)}">${escapeHtml(template.buttonLabel)}</a></p>`
    + `<p>${escapeHtml(template.footnote)}</p><p>CarePoint</p>`;
  return { to: template.to, subject: template.subject, text, html };
}

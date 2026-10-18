import { CheckCircle2 } from 'lucide-react';
import { Logo, Wordmark } from '@/components/ui/Logo';

const PULSE_PATH =
  'M0 70 H64 C72 70 74 58 84 58 C94 58 96 70 104 70 H128 L138 78 L152 10 L168 122 L178 70 H214 C228 70 232 42 250 42 C268 42 272 70 286 70 ' +
  'H338 C346 70 348 58 358 58 C368 58 370 70 378 70 H402 L412 78 L426 10 L442 122 L452 70 H488 C502 70 506 42 524 42 C542 42 546 70 560 70';

function BrandPanel() {
  return (
    <aside className="auth-art" aria-hidden="true">
      <span className="auth-art-top">CarePoint · Hospital management</span>
      <svg className="auth-pulse" viewBox="0 0 600 140" preserveAspectRatio="xMidYMid meet">
        <path d={PULSE_PATH} />
        <circle cx="560" cy="70" r="5" />
      </svg>
      <div>
        <h2>Quiet software for <em>busy</em> wards.</h2>
        <p>Appointments, records, prescriptions and billing, kept in one calm and auditable place.</p>
      </div>
    </aside>
  );
}

export function AuthCard({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="auth-main">
        <section className="auth-card">
          <div className="brand auth-brand"><Logo size={32} /><Wordmark /></div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          <div className="auth-foot"><span><CheckCircle2 size={14} /> Protected access</span><span>Admin · Doctor · Patient</span></div>
        </section>
      </div>
      <BrandPanel />
    </main>
  );
}

import { Activity, CheckCircle2 } from 'lucide-react';

export function AuthCard({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand">
          <span className="brand-mark"><Activity size={24} /></span>
          <span>care<span className="brand-light">point</span><small>HOSPITAL MANAGEMENT</small></span>
        </div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        <div className="auth-foot"><span><CheckCircle2 size={15} /> Protected access</span><span>Admin · Doctor · Patient</span></div>
      </section>
    </main>
  );
}

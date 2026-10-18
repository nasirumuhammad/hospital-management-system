'use client';
import { Activity, Bell, CalendarDays, ClipboardList, FileText, LayoutDashboard, LogOut, Pill, ReceiptText, ScrollText, Settings, Stethoscope, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { initials } from '@/lib/format';
import { NAV_ENTRIES, type NavEntry } from '@/lib/nav';

const ICONS: Record<NavEntry['icon'], typeof Activity> = {
  overview: LayoutDashboard, appointments: CalendarDays, patients: Users, doctors: Stethoscope, records: FileText,
  prescriptions: Pill, invoices: ReceiptText, accounts: UserRound, audit: ScrollText, settings: Settings,
};

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  if (!user) return null;
  const entries = NAV_ENTRIES.filter((entry) => entry.roles.includes(user.role));
  const current = entries.find((entry) => isActive(pathname, entry.href))?.label ?? 'Workspace';

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Activity size={22} /></span>
          <span>care<span className="brand-light">point</span><small>HOSPITAL MANAGEMENT</small></span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main">
          {entries.map((entry) => {
            const Icon = ICONS[entry.icon];
            return (
              <Link key={entry.href} href={entry.href} className={`nav-item ${isActive(pathname, entry.href) ? 'active' : ''}`} aria-current={isActive(pathname, entry.href) ? 'page' : undefined}>
                <Icon size={18} /><span>{entry.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar admin-avatar">{initials(user.name)}</div>
            <div><b>{user.name}</b><small>{user.role}</small></div>
          </div>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div className="crumb">Workspace <span>/</span> <b>{current}</b></div>
          <div className="top-actions">
            <div className="online"><i /> System online</div>
            <Link href="/settings" className="icon-btn" aria-label="Account settings"><Bell size={19} /></Link>
            <div className="top-user">
              <div className="avatar admin-avatar">{initials(user.name)}</div>
              <div><b>{user.name}</b><small>{user.role}</small></div>
              <button className="icon-btn" onClick={() => void logout()} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
            </div>
          </div>
        </header>
        <div className="page-wrap">
          {children}
          <footer><span>© {new Date().getFullYear()} CarePoint Healthcare</span><span><ClipboardList size={11} /> Confidential patient information</span></footer>
        </div>
      </section>
    </main>
  );
}

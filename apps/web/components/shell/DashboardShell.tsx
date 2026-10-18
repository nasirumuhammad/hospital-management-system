'use client';
import { CalendarDays, ClipboardList, FileText, LayoutDashboard, LogOut, Pill, ReceiptText, ScrollText, Settings, Stethoscope, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Logo, Wordmark } from '@/components/ui/Logo';
import { initials, titleCase } from '@/lib/format';
import { NAV_ENTRIES, type NavEntry } from '@/lib/nav';

const ICON_SIZE = 17;
const ICON_STROKE = 1.75;

const ICONS: Record<NavEntry['icon'], typeof Users> = {
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
        <div className="brand"><Logo /><Wordmark /></div>
        <div className="nav-label">Workspace</div>
        <nav aria-label="Main">
          {entries.map((entry) => {
            const Icon = ICONS[entry.icon];
            const active = isActive(pathname, entry.href);
            return (
              <Link key={entry.href} href={entry.href} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} title={entry.label}>
                <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} /><span>{entry.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar admin-avatar">{initials(user.name)}</div>
            <div><b>{user.name}</b><small>{titleCase(user.role)}</small></div>
            <button className="icon-btn" onClick={() => void logout()} title="Sign out" aria-label="Sign out"><LogOut size={16} strokeWidth={ICON_STROKE} /></button>
          </div>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div className="crumb">Workspace <span>/</span> <b>{current}</b></div>
          <div className="top-actions"><div className="online"><i /> System online</div></div>
        </header>
        <div className="page-wrap">
          {children}
          <footer><span>© {new Date().getFullYear()} CarePoint Healthcare</span><span><ClipboardList size={12} /> Confidential patient information</span></footer>
        </div>
      </section>
    </main>
  );
}

import { AuthRedirect } from '@/components/auth/AuthRedirect';
import { SessionRefresh } from '@/components/auth/SessionRefresh';
import { DashboardShell } from '@/components/shell/DashboardShell';
import { getSessionUser } from '@/lib/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) return <SessionRefresh />;
  return (
    <>
      <AuthRedirect />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}

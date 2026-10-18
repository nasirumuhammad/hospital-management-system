'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { DashboardShell } from '@/components/shell/DashboardShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') return <div className="auth-loading">Loading CarePoint…</div>;
  return <DashboardShell>{children}</DashboardShell>;
}

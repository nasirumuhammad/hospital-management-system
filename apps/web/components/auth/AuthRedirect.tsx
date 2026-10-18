'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

/** Sends the browser to /login when the session ends client-side (logout, failed refresh). */
export function AuthRedirect() {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);
  return null;
}

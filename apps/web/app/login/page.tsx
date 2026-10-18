import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { getSessionUser } from '@/lib/session';

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/');
  return (
    <AuthCard eyebrow="WELCOME BACK" title="Sign in to CarePoint" description="Access your hospital workspace securely.">
      <LoginForm />
      <div className="auth-links"><Link href="/forgot-password">Forgot your password?</Link></div>
    </AuthCard>
  );
}

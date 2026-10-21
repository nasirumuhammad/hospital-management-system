import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { ErrorBanner } from '@/components/ui/Feedback';
import { first, type PageSearchParams } from '@/lib/search-params';

export default async function ResetPasswordPage({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  const token = first(params.token) ?? '';
  const invited = first(params.invited) === '1';
  return (
    <AuthCard
      eyebrow={invited ? 'WELCOME' : 'ACCOUNT RECOVERY'}
      title={invited ? 'Set your password' : 'Choose a new password'}
      description={invited ? 'Choose a password to finish setting up your CarePoint account.' : 'Pick a strong password you have not used elsewhere.'}
    >
      {token ? <ResetPasswordForm token={token} /> : <ErrorBanner message="This reset link is incomplete. Request a new one." />}
      <div className="auth-links"><Link href="/login">Back to sign in</Link></div>
    </AuthCard>
  );
}

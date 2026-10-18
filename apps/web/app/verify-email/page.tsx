import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { EmailVerifier } from '@/components/auth/EmailVerifier';
import { ErrorBanner } from '@/components/ui/Feedback';
import { first, type PageSearchParams } from '@/lib/search-params';

export default async function VerifyEmailPage({ searchParams }: { searchParams: PageSearchParams }) {
  const token = first((await searchParams).token) ?? '';
  return (
    <AuthCard eyebrow="ACCOUNT" title="Email verification" description="Confirming your email address with CarePoint.">
      {token ? <EmailVerifier token={token} /> : <ErrorBanner message="This verification link is incomplete." />}
      <div className="auth-links"><Link href="/login">Go to sign in</Link></div>
    </AuthCard>
  );
}

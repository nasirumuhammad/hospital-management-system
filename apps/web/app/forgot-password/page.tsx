import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthCard eyebrow="ACCOUNT RECOVERY" title="Reset your password" description="Enter your email address and we will send you a reset link.">
      <ForgotPasswordForm />
      <div className="auth-links"><Link href="/login">Back to sign in</Link></div>
    </AuthCard>
  );
}

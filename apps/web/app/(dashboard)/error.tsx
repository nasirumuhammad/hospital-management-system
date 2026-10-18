'use client';
import { ErrorBanner } from '@/components/ui/Feedback';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <ErrorBanner message="Could not load this page." />
      <button className="btn secondary" onClick={reset}>Try again</button>
    </>
  );
}

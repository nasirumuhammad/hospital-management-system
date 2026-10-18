import { AlertCircle, CheckCircle2, ClipboardList, X } from 'lucide-react';

const BANNER_ICON_SIZE = 16;

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div className="banner error-banner" role="alert">
      <AlertCircle size={BANNER_ICON_SIZE} />
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} aria-label="Dismiss"><X size={BANNER_ICON_SIZE} /></button>}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="banner success-banner" role="status">
      <CheckCircle2 size={BANNER_ICON_SIZE} />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ loading, label }: { loading: boolean; label: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><ClipboardList size={18} strokeWidth={1.75} /></span>
      <b>{loading ? 'Loading records…' : `No ${label} found`}</b>
      <span>{loading ? 'Connecting to the server' : 'Nothing to show yet.'}</span>
    </div>
  );
}

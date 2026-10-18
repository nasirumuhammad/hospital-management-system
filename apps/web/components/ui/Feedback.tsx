import { ClipboardList, X } from 'lucide-react';

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} aria-label="Dismiss"><X size={16} /></button>}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return message ? <div className="success-banner" role="status">{message}</div> : null;
}

export function EmptyState({ loading, label }: { loading: boolean; label: string }) {
  return (
    <div className="empty-state">
      <ClipboardList size={26} />
      <b>{loading ? 'Loading records…' : `No ${label} found`}</b>
      <span>{loading ? 'Connecting to the server' : 'Nothing to show yet.'}</span>
    </div>
  );
}

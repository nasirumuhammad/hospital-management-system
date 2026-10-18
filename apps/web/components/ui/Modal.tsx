'use client';
import { X } from 'lucide-react';
import { useEffect, useId } from 'react';

interface ModalProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  wide?: boolean;
  children: React.ReactNode;
}

export function Modal({ title, eyebrow = 'DETAILS', onClose, onSubmit, wide = false, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const header = (
    <div className="modal-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={titleId}>{title}</h2>
      </div>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} strokeWidth={1.75} /></button>
    </div>
  );
  const style = wide ? { width: 'min(100%, 640px)' } : undefined;
  const dialogProps = { role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, style } as const;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      {onSubmit
        ? <form className="modal" {...dialogProps} onSubmit={onSubmit}>{header}{children}</form>
        : <div className="modal" {...dialogProps}>{header}{children}</div>}
    </div>
  );
}

export function ModalActions({ onCancel, submitLabel, busy = false }: { onCancel: () => void; submitLabel: string; busy?: boolean }) {
  return (
    <div className="modal-actions">
      <button type="button" className="btn secondary" onClick={onCancel}>Cancel</button>
      <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </div>
  );
}

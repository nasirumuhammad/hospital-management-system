'use client';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  wide?: boolean;
  children: React.ReactNode;
}

export function Modal({ title, eyebrow = 'DETAILS', onClose, onSubmit, wide = false, children }: ModalProps) {
  const header = (
    <div className="modal-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button>
    </div>
  );
  const style = wide ? { width: 'min(100%, 640px)' } : undefined;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      {onSubmit
        ? <form className="modal" style={style} onSubmit={onSubmit}>{header}{children}</form>
        : <div className="modal" style={style}>{header}{children}</div>}
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

'use client';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

type ConfirmAction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmAction | null>(null);

/**
 * In-app replacement for window.confirm. Browser dialogs are not allowed in this
 * project (see `pnpm check:dialogs`): call `confirmAction()` from useConfirmDialog().
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirmAction = useCallback<ConfirmAction>((options) => {
    resolver.current?.(false); // a newer request supersedes one still open
    setPending(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setPending(null);
  }, []);

  const cancel = useCallback(() => settle(false), [settle]);
  const confirmed = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    settle(true);
  }, [settle]);

  const value = useMemo(() => confirmAction, [confirmAction]);
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && <ConfirmModal options={pending} onCancel={cancel} onSubmit={confirmed} />}
    </ConfirmContext.Provider>
  );
}

interface ConfirmModalProps {
  options: ConfirmOptions;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function ConfirmModal({ options, onCancel, onSubmit }: ConfirmModalProps) {
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default' } = options;
  return (
    <Modal title={title} eyebrow="CONFIRM" onClose={onCancel} onSubmit={onSubmit}>
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn secondary" onClick={onCancel} autoFocus>{cancelLabel}</button>
        <button type="submit" className={tone === 'danger' ? 'btn danger' : 'btn primary'}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function useConfirmDialog(): ConfirmAction {
  const confirmAction = useContext(ConfirmContext);
  if (!confirmAction) throw new Error('useConfirmDialog must be used inside ConfirmProvider');
  return confirmAction;
}

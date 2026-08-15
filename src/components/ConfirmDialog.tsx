import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
      const handler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onCancel();
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
          {tone === 'danger' && (
            <div className="icon-chip" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', width: 40, height: 40 }}>
              <AlertTriangle size={20} />
            </div>
          )}
          <div>
            <h3 id="confirm-title">{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button ref={confirmRef} className={tone === 'danger' ? 'btn btn-danger-solid' : 'btn btn-primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

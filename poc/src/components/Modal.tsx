import { PropsWithChildren } from "react";

import "../styles/modal.css";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  width?: number | string;
}

export function Modal({ open, title, onClose, width = 420, children }: PropsWithChildren<ModalProps>) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-surface" style={{ maxWidth: typeof width === "number" ? `${width}px` : width }}>
        <header className="modal-header">
          {title && <h2>{title}</h2>}
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}

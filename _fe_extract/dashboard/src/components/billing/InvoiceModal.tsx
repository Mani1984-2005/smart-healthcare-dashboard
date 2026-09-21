import { ReactNode } from "react";
import Modal from "../common/Modal.jsx";
import Button from "../common/Button.jsx";

type InvoiceModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
};

export default function InvoiceModal({ open, title, children, onClose, onConfirm, confirmLabel = "Confirm", confirmVariant = "danger", loading }: InvoiceModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-6">{children}</div>
      {onConfirm && (
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={loading}>{confirmLabel}</Button>
        </div>
      )}
    </Modal>
  );
}

import { ReactNode } from "react";
import Modal from "../common/Modal.jsx";
import Button from "../common/Button.jsx";

type PatientModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  loading?: boolean;
};

export default function PatientModal({ open, title, children, onClose, onConfirm, confirmLabel = "Confirm", loading }: PatientModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-6">{children}</div>
      {onConfirm && (
        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={loading}>
            {confirmLabel}
          </Button>
        </div>
      )}
    </Modal>
  );
}

// FILE PATH: src/components/ui/Modal.jsx
// CREATE this new file.
//
// Reusable modal/dialog primitive. Pure UI — no business logic.
// Replaces the inline "fixed inset-0 bg-black/40..." pattern duplicated
// across PharmacyPage, LaboratoryPage, BillingPage, etc.
//
// USAGE:
//   <Modal open={showForm} onClose={closeForm} title="Add Medicine" size="lg">
//     ...form fields...
//     <Modal.Footer>
//       <Button variant="outline" onClick={closeForm}>Cancel</Button>
//       <Button onClick={handleSubmit}>Save</Button>
//     </Modal.Footer>
//   </Modal>

import { useEffect } from "react";
import { X } from "lucide-react";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  full: "max-w-5xl",
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  hideCloseButton = false,
  className = "",
}) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = original; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-[2px] flex items-start justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`
          bg-white rounded-xl shadow-modal w-full my-8 overflow-hidden
          animate-slide-up
          ${SIZE_CLASSES[size]}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-neutral-100">
            <div className="min-w-0">
              {title && <h2 className="text-h2 text-neutral-800">{title}</h2>}
              {subtitle && <p className="text-small text-neutral-500 mt-0.5">{subtitle}</p>}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/**
 * Modal.Footer — sticky action bar at the bottom of a modal.
 * Place Cancel/Confirm buttons inside, right-aligned by default.
 */
function Footer({ children, className = "" }) {
  return (
    <div className={`flex items-center justify-end gap-3 px-6 py-4 -mx-6 -mb-5 mt-5 border-t border-neutral-100 bg-neutral-50 ${className}`}>
      {children}
    </div>
  );
}

Modal.Footer = Footer;
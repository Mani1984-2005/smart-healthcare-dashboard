import { useState } from "react";
import { ShieldCheck, LoaderCircle, CircleCheck, CircleX } from "lucide-react";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import { formatINR } from "../../utils/formatCurrency";
import { usePaymentStore } from "../../stores/paymentStore";
import type { Invoice } from "../../types/payment";

type SecurePaymentDialogProps = {
  open: boolean;
  invoice: Invoice | null;
  patient: { name: string; email?: string; phone?: string };
  onClose: () => void;
};

// UPI is listed first per brief section 7 ("design for modern UPI payment
// flows" as the primary Indian experience); Razorpay Checkout itself renders
// the actual method picker (UPI apps / cards / netbanking / wallets) once
// opened, so this is a lightweight confirmation step, not a re-implementation
// of Razorpay's own UI. Brief section 7 is explicit that PIN/CVV/password
// entry must stay inside the provider's secure surface, never inside
// MediCare Pro — that boundary is why this component never asks for any of
// that information itself.
export default function SecurePaymentDialog({ open, invoice, patient, onClose }: SecurePaymentDialogProps) {
  const { payFlow, startPayment, resetPayFlow } = usePaymentStore();
  const [acknowledged, setAcknowledged] = useState(false);

  if (!invoice) return null;
  const currentInvoice = invoice; // stable const so narrowing survives into nested closures below

  const isBusy = payFlow.status === "creating_order" || payFlow.status === "awaiting_checkout" || payFlow.status === "confirming";

  function handleClose() {
    if (isBusy) return; // brief section 35: don't let the modal be dismissed mid-processing
    resetPayFlow();
    setAcknowledged(false);
    onClose();
  }

  async function handlePay() {
    await startPayment(currentInvoice, patient);
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Secure Payment">
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Invoice</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Patient</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{patient.name}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount Due</span>
            <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatINR(invoice.balanceDue)}</span>
          </div>
        </div>

        {payFlow.status === "idle" && (
          <>
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
              <p>
                Your payment is processed through a secure payment provider. You will choose UPI, card, netbanking, or
                a wallet on the next screen. MediCare Pro never asks for your UPI PIN, card CVV, or banking password.
              </p>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              I understand my card/UPI/banking credentials are entered only on the secure payment provider's screen.
            </label>
            <Button className="w-full" disabled={!acknowledged} onClick={handlePay}>
              Pay Securely — {formatINR(invoice.balanceDue)}
            </Button>
          </>
        )}

        {(payFlow.status === "creating_order" || payFlow.status === "awaiting_checkout" || payFlow.status === "confirming") && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {payFlow.status === "creating_order" && "Setting up your secure payment…"}
              {payFlow.status === "awaiting_checkout" && "Complete your payment in the window that opened."}
              {payFlow.status === "confirming" && "Verifying your payment — please don't close this window."}
            </p>
            {payFlow.status === "confirming" && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your payment is being verified. Please do not pay again until the status is confirmed.
              </p>
            )}
          </div>
        )}

        {payFlow.status === "success" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CircleCheck className="h-10 w-10 text-emerald-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Payment successful</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your invoice has been updated and a receipt is on its way.</p>
            <Button variant="secondary" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}

        {payFlow.status === "failed" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CircleX className="h-10 w-10 text-rose-600" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your payment could not be completed</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {payFlow.error || "No amount has been marked as paid. You can try again."}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => { resetPayFlow(); setAcknowledged(true); handlePay(); }}>Try again</Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

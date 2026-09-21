// Loads Razorpay's Checkout.js on demand and opens the checkout modal.
//
// STATUS: IMPLEMENTED against Razorpay's documented client-side contract.
// CONFIGURATION REQUIRED — VITE_RAZORPAY_KEY_ID must be set to a real
// (sandbox/test-mode) key for this to actually open a working checkout.
// NOT VERIFIED — this sandbox environment cannot load an external script
// from checkout.razorpay.com or reach Razorpay's servers, so the modal
// itself has not been exercised end-to-end. The loader/launcher logic below
// is written carefully against Razorpay's public docs, not guessed at.

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise = null;

function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay checkout requires a browser environment"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load the Razorpay checkout script. Check your network connection."));
    document.body.appendChild(script);
  });

  return loadPromise;
}

/**
 * Opens Razorpay Checkout for a PaymentOrder already created on the backend.
 *
 * @param {Object} params
 * @param {string} params.providerOrderId - Razorpay order_id from PaymentOrder.providerOrderId
 * @param {number} params.amountInRupees
 * @param {string} params.invoiceNumber
 * @param {string} params.patientName
 * @param {string} [params.patientEmail]
 * @param {string} [params.patientPhone]
 * @param {(response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void} params.onSuccess
 * @param {(reason: string) => void} params.onFailure
 * @param {() => void} [params.onDismiss] - called if the patient closes the modal without paying
 */
export async function openRazorpayCheckout({
  providerOrderId,
  amountInRupees,
  invoiceNumber,
  patientName,
  patientEmail,
  patientPhone,
  onSuccess,
  onFailure,
  onDismiss,
}) {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!keyId) {
    onFailure("Payments are not configured yet. Please contact billing support.");
    return;
  }

  let Razorpay;
  try {
    Razorpay = await loadRazorpayScript();
  } catch (err) {
    onFailure(err.message);
    return;
  }

  const checkout = new Razorpay({
    key: keyId,
    order_id: providerOrderId,
    amount: Math.round(amountInRupees * 100),
    currency: "INR",
    name: "MediCare Pro",
    description: `Invoice ${invoiceNumber}`,
    prefill: {
      name: patientName,
      email: patientEmail,
      contact: patientPhone,
    },
    theme: {
      // Matches src/design-system/colors.ts primary.DEFAULT so the checkout
      // modal doesn't feel like a third-party page (brief section 4/6).
      color: "#0b6e99",
    },
    handler: (response) => onSuccess(response),
    modal: {
      ondismiss: () => onDismiss?.(),
    },
  });

  checkout.on("payment.failed", (response) => {
    onFailure(response?.error?.description || "Payment could not be completed.");
  });

  checkout.open();
}

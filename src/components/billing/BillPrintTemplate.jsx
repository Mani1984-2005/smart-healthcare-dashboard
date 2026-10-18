// FILE PATH: src/components/billing/BillPrintTemplate.jsx
//
// Hospital-style invoice template — rendered off-screen, captured by
// html2canvas, then written into a PDF by jsPDF (via billPdfGenerator.js).
// Also used as-is for browser Print.
//
// Intentionally uses inline styles in a few places so html2canvas renders
// colours correctly even when Tailwind's CSS is not injected into the
// off-screen element tree. (html2canvas reads computed styles; when the
// element is off-screen at -9999px it still inherits the document styles,
// so Tailwind classes work fine here — but brand colours are duplicated
// as inline fallbacks just in case.)
//
// PROPS:
//   bill: full bill object from billingStorage

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

export default function BillPrintTemplate({ bill }) {
  if (!bill) return null;

  const lineItems = [
    { label: "Consultation Fee",    value: bill.consultationFee },
    { label: "Medicine Charges",    value: bill.medicineCharges },
    { label: "Lab / Test Charges",  value: bill.labCharges },
    { label: "Other Charges",       value: bill.otherCharges },
  ].filter((item) => Number(item.value) > 0);

  return (
    <div
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        width: "680px",
        background: "#ffffff",
        padding: "0",
        color: "#131A19",
      }}
    >
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #2A7D75 0%, #18504C 100%)",
        color: "#ffffff",
        padding: "28px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "-0.3px" }}>
            🏥 MediCare Pro
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
            Smart Healthcare Dashboard
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "13px", opacity: 0.75 }}>TAX INVOICE</div>
          <div style={{ fontSize: "18px", fontWeight: "700", marginTop: "4px" }}>
            {bill.billId}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>
            Date: {fmtDate(bill.billDate)}
          </div>
        </div>
      </div>

      {/* Patient Info */}
      <div style={{ padding: "24px 32px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <div style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#66807C", marginBottom: "8px" }}>
            Billed To
          </div>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#131A19" }}>{bill.patientName}</div>
          {bill.patientId && <div style={{ fontSize: "12px", color: "#66807C", marginTop: "2px" }}>ID: {bill.patientId}</div>}
        </div>
        <div>
          <div style={{ fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#66807C", marginBottom: "8px" }}>
            Attending Doctor
          </div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#131A19" }}>
            {bill.doctorName ? `Dr. ${bill.doctorName}` : "—"}
          </div>
          <div style={{ fontSize: "12px", color: "#66807C", marginTop: "2px" }}>
            Payment: {bill.paymentMode} &bull; {bill.paymentStatus}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: "20px 32px 0", height: "1px", background: "#DEE6E5" }} />

      {/* Line items */}
      <div style={{ padding: "0 32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr style={{ background: "#EEF3F2" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.07em", color: "#66807C" }}>
                Description
              </th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.07em", color: "#66807C" }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.label} style={{ borderBottom: "1px solid #EEF3F2" }}>
                <td style={{ padding: "10px 12px", fontSize: "13px", color: "#394A48" }}>{item.label}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: "13px", color: "#25302F" }}>{fmt(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals block */}
      <div style={{ padding: "0 32px 24px" }}>
        <div style={{ marginLeft: "auto", width: "280px", marginTop: "12px" }}>
          <TotalLine label="Subtotal" value={fmt(bill.subtotal)} />
          {bill.discountAmt > 0 && (
            <TotalLine label="Discount" value={`− ${fmt(bill.discountAmt)}`} color="#D9462F" />
          )}
          {bill.gstAmount > 0 && (
            <TotalLine label="GST" value={fmt(bill.gstAmount)} />
          )}
          <div style={{ height: "1px", background: "#C2CECC", margin: "8px 0" }} />
          <TotalLine label="Grand Total" value={fmt(bill.grandTotal)} bold accent />
        </div>
      </div>

      {/* Notes */}
      {bill.notes && (
        <div style={{ padding: "0 32px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "#66807C", marginBottom: "4px" }}>Notes</div>
          <div style={{ fontSize: "12px", color: "#394A48" }}>{bill.notes}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ background: "#EEF3F2", padding: "14px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "#66807C" }}>
          Thank you for choosing MediCare Pro — Smart Healthcare Dashboard
        </div>
        <div style={{ fontSize: "10px", color: "#94A6A3", marginTop: "4px" }}>
          This is a computer-generated invoice and does not require a physical signature.
        </div>
      </div>
    </div>
  );
}

function TotalLine({ label, value, bold, accent, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
      <span style={{ fontSize: bold ? "14px" : "12px", fontWeight: bold ? "700" : "500", color: "#394A48" }}>{label}</span>
      <span style={{
        fontSize: bold ? "16px" : "12px",
        fontWeight: bold ? "700" : "500",
        color: accent ? "#2A7D75" : color || "#25302F",
      }}>
        {value}
      </span>
    </div>
  );
}
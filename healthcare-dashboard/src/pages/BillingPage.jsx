import { useState } from "react";

export default function BillingPage({ darkMode }) {
  const [bill, setBill] = useState({
    patientName: "",
    doctorFee: "",
    medicineCharges: "",
    labCharges: "",
    discount: "",
    tax: "",
    paymentStatus: "Pending",
  });

  const doctorFee = Number(bill.doctorFee) || 0;
  const medicineCharges = Number(bill.medicineCharges) || 0;
  const labCharges = Number(bill.labCharges) || 0;
  const discount = Number(bill.discount) || 0;
  const tax = Number(bill.tax) || 0;

  const subtotal = doctorFee + medicineCharges + labCharges;
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * tax) / 100;
  const totalAmount = taxableAmount + taxAmount;

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-slate-500 mt-2">Create and calculate patient bills.</p>

      <div className={`mt-6 p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Patient Name" value={bill.patientName} onChange={(e) => setBill({ ...bill, patientName: e.target.value })} />
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Doctor Fee" value={bill.doctorFee} onChange={(e) => setBill({ ...bill, doctorFee: e.target.value })} />
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Medicine Charges" value={bill.medicineCharges} onChange={(e) => setBill({ ...bill, medicineCharges: e.target.value })} />
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Lab Charges" value={bill.labCharges} onChange={(e) => setBill({ ...bill, labCharges: e.target.value })} />
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Discount %" value={bill.discount} onChange={(e) => setBill({ ...bill, discount: e.target.value })} />
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Tax %" value={bill.tax} onChange={(e) => setBill({ ...bill, tax: e.target.value })} />

          <select className="border p-3 rounded-lg text-slate-900" value={bill.paymentStatus} onChange={(e) => setBill({ ...bill, paymentStatus: e.target.value })}>
            <option>Pending</option>
            <option>Paid</option>
            <option>Partial</option>
          </select>
        </div>

        <div className={`mt-6 p-5 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
          <h2 className="text-lg font-semibold mb-3">Bill Summary</h2>
          <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
          <p>Discount: ₹{discountAmount.toFixed(2)}</p>
          <p>Tax: ₹{taxAmount.toFixed(2)}</p>
          <p className="text-xl font-bold mt-3">Total: ₹{totalAmount.toFixed(2)}</p>
          <p className="mt-2">Payment Status: {bill.paymentStatus}</p>
        </div>
      </div>
    </div>
  );
}
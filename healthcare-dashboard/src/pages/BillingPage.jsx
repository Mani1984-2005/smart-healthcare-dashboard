import { useState } from "react";

export default function BillingPage({ darkMode }) {
  const [invoices, setInvoices] = useState([]);
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

  const totalRevenue = invoices
    .filter((invoice) => invoice.paymentStatus === "Paid")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  const pendingAmount = invoices
    .filter((invoice) => invoice.paymentStatus === "Pending")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  const handleCreateInvoice = () => {
    if (!bill.patientName || totalAmount <= 0) {
      alert("Please enter patient name and valid bill details");
      return;
    }

    const newInvoice = {
      id: `INV-${Date.now()}`,
      ...bill,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setInvoices([newInvoice, ...invoices]);

    setBill({
      patientName: "",
      doctorFee: "",
      medicineCharges: "",
      labCharges: "",
      discount: "",
      tax: "",
      paymentStatus: "Pending",
    });
  };

  const deleteInvoice = (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    setInvoices(invoices.filter((invoice) => invoice.id !== id));
  };

  const viewInvoice = (invoice) => {
    alert(
      `Invoice ID: ${invoice.id}

Patient: ${invoice.patientName}

Subtotal: ₹${invoice.subtotal.toFixed(2)}

Discount: ₹${invoice.discountAmount.toFixed(2)}

Tax: ₹${invoice.taxAmount.toFixed(2)}

Total Amount: ₹${invoice.totalAmount.toFixed(2)}

Status: ${invoice.paymentStatus}

Date: ${invoice.createdAt}`
    );
  };

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-slate-500 mt-2">Create bills, save invoices and track revenue.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
          <p className="text-sm text-slate-500">Total Invoices</p>
          <h2 className="text-3xl font-bold">{invoices.length}</h2>
        </div>

        <div className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
          <p className="text-sm text-slate-500">Paid Revenue</p>
          <h2 className="text-3xl font-bold text-emerald-500">₹{totalRevenue.toFixed(2)}</h2>
        </div>

        <div className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
          <p className="text-sm text-slate-500">Pending Amount</p>
          <h2 className="text-3xl font-bold text-yellow-500">₹{pendingAmount.toFixed(2)}</h2>
        </div>
      </div>

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

          <button onClick={handleCreateInvoice} className="mt-5 bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-cyan-700">
            Save Invoice
          </button>
        </div>
      </div>

      <div className={`mt-6 rounded-xl shadow overflow-x-auto ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-cyan-600 text-white">
            <tr>
              <th className="p-3 text-left">Invoice ID</th>
              <th className="p-3 text-left">Patient</th>
              <th className="p-3 text-left">Subtotal</th>
              <th className="p-3 text-left">Discount</th>
              <th className="p-3 text-left">Tax</th>
              <th className="p-3 text-left">Total</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className={`border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <td className="p-3 font-bold text-cyan-500">{invoice.id}</td>
                <td className="p-3">{invoice.patientName}</td>
                <td className="p-3">₹{invoice.subtotal.toFixed(2)}</td>
                <td className="p-3">₹{invoice.discountAmount.toFixed(2)}</td>
                <td className="p-3">₹{invoice.taxAmount.toFixed(2)}</td>
                <td className="p-3 font-bold">₹{invoice.totalAmount.toFixed(2)}</td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      invoice.paymentStatus === "Paid"
                        ? "bg-green-100 text-green-700"
                        : invoice.paymentStatus === "Partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {invoice.paymentStatus}
                  </span>
                </td>
                <td className="p-3">{invoice.createdAt}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => viewInvoice(invoice)} className="bg-cyan-600 text-white px-3 py-1 rounded-lg">
                      View
                    </button>
                    <button onClick={() => deleteInvoice(invoice.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {invoices.length === 0 && (
              <tr>
                <td colSpan="9" className="p-5 text-center text-slate-500">
                  No invoices created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
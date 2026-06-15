import { useState } from "react";

export default function PharmacyPage({ darkMode }) {
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState({
    name: "",
    stock: "",
    price: "",
    expiry: "",
  });

  const addMedicine = (e) => {
    e.preventDefault();

    if (!form.name || !form.stock || !form.price || !form.expiry) {
      alert("Please fill all fields");
      return;
    }

    setMedicines([{ id: Date.now(), ...form }, ...medicines]);
    setForm({ name: "", stock: "", price: "", expiry: "" });
  };

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Pharmacy</h1>
      <p className="text-slate-500 mt-2">Manage medicine stock and expiry.</p>

      <form onSubmit={addMedicine} className={`mt-6 p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-5 gap-3 ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Medicine Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Stock Quantity" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <input className="border p-3 rounded-lg text-slate-900" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input type="date" className="border p-3 rounded-lg text-slate-900" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />

        <button className="bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700">
          Add Medicine
        </button>
      </form>

      <div className={`mt-6 rounded-xl shadow overflow-x-auto ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <table className="w-full text-sm">
          <thead className="bg-cyan-600 text-white">
            <tr>
              <th className="p-3 text-left">Medicine</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Expiry</th>
              <th className="p-3 text-left">Alert</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((med) => (
              <tr key={med.id} className="border-b">
                <td className="p-3">{med.name}</td>
                <td className="p-3">{med.stock}</td>
                <td className="p-3">₹{med.price}</td>
                <td className="p-3">{med.expiry}</td>
                <td className="p-3">
                  {Number(med.stock) < 10 ? "Low Stock" : "Available"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
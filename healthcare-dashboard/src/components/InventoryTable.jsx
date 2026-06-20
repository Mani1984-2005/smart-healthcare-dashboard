// FILE PATH: src/components/InventoryTable.jsx
//
// Displays the medicine inventory in a searchable, filterable table.
// Pure presentational + local filter state — all data and handlers come
// from props so it stays decoupled from the storage layer.
//
// PROPS:
//   medicines: array of medicine records
//   onEdit(medicine): called when Edit is clicked
//   onDelete(medicineId): called when Delete is clicked
//   onPurchase(medicine): called when "Purchase" quick-action is clicked
//   onSale(medicine): called when "Issue/Sale" quick-action is clicked
//   isLowStock, isOutOfStock, isExpired, isExpiringSoon: helper fns from InventoryStorage.js

import { useState } from "react";

const CATEGORIES = [
  "Antibiotic", "Analgesic", "Antiviral", "Antifungal", "Antihistamine",
  "Cardiovascular", "Diabetes", "Vitamins & Supplements", "Respiratory", "Other",
];

function fmt(n) {
  return "₹" + Number(n || 0).toFixed(2);
}

export default function InventoryTable({
  medicines,
  onEdit,
  onDelete,
  onPurchase,
  onSale,
  isLowStock,
  isOutOfStock,
  isExpired,
  isExpiringSoon,
}) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterAlert, setFilterAlert] = useState("All"); // All | Low Stock | Expired | Expiring Soon | Out of Stock

  const filtered = medicines.filter((m) => {
    const term = search.toLowerCase();
    const matchSearch =
      m.name.toLowerCase().includes(term) ||
      m.medicineId.toLowerCase().includes(term) ||
      (m.batchNumber || "").toLowerCase().includes(term) ||
      (m.supplier || "").toLowerCase().includes(term) ||
      (m.barcode || "").toLowerCase().includes(term);

    const matchCategory = filterCategory === "All" || m.category === filterCategory;

    let matchAlert = true;
    if (filterAlert === "Low Stock") matchAlert = isLowStock(m);
    if (filterAlert === "Out of Stock") matchAlert = isOutOfStock(m);
    if (filterAlert === "Expired") matchAlert = isExpired(m);
    if (filterAlert === "Expiring Soon") matchAlert = isExpiringSoon(m);

    return matchSearch && matchCategory && matchAlert;
  });

  return (
    <div>
      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search name, ID, batch, supplier, barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterAlert}
          onChange={(e) => setFilterAlert(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="All">All Stock Status</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
          <option value="Expiring Soon">Expiring Soon</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">ID / Batch</th>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Purchase / Sell</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No medicines match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const expired = isExpired(m);
                const expSoon = isExpiringSoon(m);
                const low = isLowStock(m);
                const out = isOutOfStock(m);

                const rowBg = expired
                  ? "bg-red-50"
                  : out
                  ? "bg-gray-100"
                  : low || expSoon
                  ? "bg-yellow-50"
                  : "hover:bg-gray-50";

                return (
                  <tr key={m.medicineId} className={rowBg}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-500">{m.medicineId}</p>
                      <p className="font-mono text-xs text-gray-400">{m.batchNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{m.name}</p>
                      {m.barcode && <p className="text-xs text-gray-400 font-mono">📊 {m.barcode}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.category}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${
                        out ? "text-red-600" : low ? "text-yellow-600" : "text-gray-800"
                      }`}>
                        {m.stockQuantity} {m.unit}
                      </span>
                      {low && !out && <span className="block text-xs text-yellow-500">Low Stock</span>}
                      {out && <span className="block text-xs text-red-500">Out of Stock</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="text-xs">Buy: {fmt(m.purchasePrice)}</p>
                      <p className="text-xs">Sell: {fmt(m.sellingPrice)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.supplier}</td>
                    <td className="px-4 py-3">
                      <span className={expired ? "text-red-600 font-semibold" : expSoon ? "text-yellow-600 font-medium" : "text-gray-600"}>
                        {m.expiryDate}
                      </span>
                      {expired && <span className="block text-xs text-red-500">Expired</span>}
                      {!expired && expSoon && <span className="block text-xs text-yellow-500">Expiring Soon</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        m.status === "Available" ? "bg-green-100 text-green-700" :
                        m.status === "Out of Stock" ? "bg-red-100 text-red-700" :
                        "bg-gray-200 text-gray-600"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => onPurchase(m)}
                          className="text-emerald-600 hover:text-emerald-800 text-xs font-medium border border-emerald-200 px-2 py-1 rounded transition"
                          title="Record purchase (stock in)"
                        >
                          + Stock
                        </button>
                        <button
                          onClick={() => onSale(m)}
                          disabled={out}
                          className="text-orange-600 hover:text-orange-800 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium border border-orange-200 px-2 py-1 rounded transition"
                          title="Issue / sell stock"
                        >
                          − Issue
                        </button>
                        <button
                          onClick={() => onEdit(m)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-2 py-1 rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(m.medicineId)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 px-2 py-1 rounded transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            Showing {filtered.length} of {medicines.length} medicine(s)
          </div>
        )}
      </div>
    </div>
  );
}
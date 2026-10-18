import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import BarcodeScanner from "../components/BarcodeScanner";
import Toast from "../components/pharmacy/Toast";
import MetricCard from "../components/pharmacy/MetricCard";
import AlertBanner from "../components/pharmacy/AlertBanner";
import TableRow from "../components/pharmacy/TableRow";
import MedicineViewModal from "../components/pharmacy/MedicineViewModal";
import FormModal from "../components/pharmacy/FormModal";
import EmptyState from "../components/pharmacy/EmptyState";
import AlertSection from "../components/pharmacy/AlertSection";
import MedicinesPage from "./MedicinesPage";
import PharmacyInventoryPage from "./PharmacyInventoryPage";
import PrescriptionPage from "./pharmacy/PrescriptionPage";
import {
  STORAGE_KEY,
  CATEGORIES,
  LOW_STOCK_THRESHOLD,
  EXPIRY_WARNING_DAYS,
  emptyForm,
  getStockStatus,
  getQty,
  getPrice,
  getPurchasePrice,
  formatCurrencyCompact,
  isExpired,
  isExpiringSoon,
  downloadMedicinePDF,
  exportUtils,
} from "../components/pharmacy/pharmacyUtils";

export default function PharmacyPage({ darkMode, initialTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || initialTab || "overview";
  const [activeTab, setActiveTab] = useState(urlTab);

  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [toast, setToast] = useState(null);
  const [viewingMedicine, setViewingMedicine] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMedicines(JSON.parse(saved));
    } catch {
      setMedicines([]);
    }
  }, []);

  useEffect(() => {
    if (medicines.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    }
  }, [medicines]);

  function showToast(msg, type = "success") {
    setToast({ message: msg, type });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(med) {
    setForm({ ...emptyForm, ...med });
    setEditingId(med.medicineId);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function validate() {
    if (!form.medicineId?.trim()) return "Medicine ID is required.";
    if (!form.name?.trim()) return "Medicine Name is required.";
    if (!form.category) return "Category is required.";
    const qty = Number(form.stockQuantity ?? form.quantity ?? "");
    if (isNaN(qty) || qty < 0) return "Stock Quantity must be a valid non-negative number.";
    const price = Number(form.sellingPrice ?? form.price ?? "");
    if (isNaN(price) || price < 0) return "Selling Price must be a valid non-negative number.";
    if (!form.supplier?.trim()) return "Supplier is required.";
    if (!form.expiryDate) return "Expiry Date is required.";
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) {
      showToast(error, "error");
      return;
    }
    const record = {
      ...form,
      price: form.sellingPrice || form.price || "",
      quantity: form.stockQuantity || form.quantity || "",
    };
    if (editingId) {
      setMedicines((prev) =>
        prev.map((m) => (m.medicineId === editingId ? record : m))
      );
      showToast("Medicine updated successfully.", "success");
    } else {
      if (medicines.find((m) => m.medicineId === form.medicineId.trim())) {
        showToast("A medicine with this ID already exists.", "error");
        return;
      }
      setMedicines((prev) => [...prev, record]);
      showToast("Medicine added successfully.", "success");
    }
    closeForm();
  }

  function handleDelete(medicineId) {
    if (!window.confirm("Delete this medicine record? This cannot be undone.")) return;
    setMedicines((prev) => prev.filter((m) => m.medicineId !== medicineId));
    showToast("Medicine deleted.", "warning");
  }

  const stats = useMemo(() => {
    const total = medicines.length;
    const low = medicines.filter((m) => getStockStatus(m) === "Low Stock").length;
    const expired = medicines.filter((m) => getStockStatus(m) === "Expired").length;
    const expiringSoon = medicines.filter((m) => getStockStatus(m) === "Expiring Soon").length;
    const outOfStock = medicines.filter((m) => getStockStatus(m) === "Out of Stock").length;
    const available = medicines.filter((m) => getStockStatus(m) === "Available").length;
    const inventoryValue = medicines.reduce((sum, m) => sum + getQty(m) * getPrice(m), 0);
    const inventoryCost = medicines.reduce((sum, m) => sum + getQty(m) * getPurchasePrice(m), 0);
    const potentialProfit = inventoryValue - inventoryCost;
    const categoryBreakdown = medicines.reduce((acc, m) => {
      const c = m.category || "Other";
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});
    return {
      total,
      low,
      expired,
      expiringSoon,
      outOfStock,
      available,
      inventoryValue,
      inventoryCost,
      potentialProfit,
      categoryBreakdown,
    };
  }, [medicines]);

  const alertMedicines = useMemo(
    () => ({
      expired: medicines.filter((m) => getStockStatus(m) === "Expired"),
      expiringSoon: medicines.filter((m) => getStockStatus(m) === "Expiring Soon"),
      lowStock: medicines.filter((m) => getStockStatus(m) === "Low Stock"),
      outOfStock: medicines.filter((m) => getStockStatus(m) === "Out of Stock"),
    }),
    [medicines]
  );

  const totalAlerts = stats.expired + stats.expiringSoon + stats.low + stats.outOfStock;

  const filtered = useMemo(() => {
    return medicines.filter((m) => {
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        m.name?.toLowerCase().includes(term) ||
        m.medicineId?.toLowerCase().includes(term) ||
        m.supplier?.toLowerCase().includes(term) ||
        m.genericName?.toLowerCase().includes(term) ||
        m.batchNumber?.toLowerCase().includes(term);
      const matchCat = filterCategory === "All" || m.category === filterCategory;
      const matchStatus = filterStatus === "All" || getStockStatus(m) === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [medicines, search, filterCategory, filterStatus]);

  const hasActiveFilters = search || filterCategory !== "All" || filterStatus !== "All";

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊", badge: totalAlerts },
    { id: "medicines", label: "Medicine Catalogue", icon: "💊" },
    { id: "inventory", label: "Inventory Management", icon: "📦" },
    { id: "dispensing", label: "Dispensing & Prescriptions", icon: "📝" },
  ];

  return (
    <div className={`w-full ${darkMode ? "text-white" : "text-slate-900"} space-y-6`}>
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-black">Pharmacy Module</h1>
              {totalAlerts > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {totalAlerts} alerts
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">
              Integrated medicines catalogue, inventory transactions, stock movements, and dispensing.
            </p>
          </div>
          {activeTab === "overview" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportUtils.inventoryPDF(medicines)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:border-slate-300 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3" />
                </svg>
                Export
              </button>
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:border-slate-300 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m10-16h-4a2 2 0 00-2 2v4m6 10v-4a2 2 0 00-2-2h-4" />
                </svg>
                Scan
              </button>
              <button
                onClick={openAddForm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Medicine
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm w-fit">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow-sm"
                    : darkMode
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      isActive ? "bg-white text-teal-700" : "bg-red-500 text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Medicines" value={stats.total} icon="📦" color="teal" sub={`${stats.available} available`} />
              <MetricCard label="Inventory Value" value={formatCurrencyCompact(stats.inventoryValue)} icon="💰" color="emerald" sub="At selling price" />
              <MetricCard label="Inventory Cost" value={formatCurrencyCompact(stats.inventoryCost)} icon="🏷️" color="blue" sub="At purchase price" />
              <MetricCard label="Potential Profit" value={formatCurrencyCompact(stats.potentialProfit)} icon="📈" color="violet" sub="Sell - Buy (full stock)" alert={stats.potentialProfit < 0} />
              <MetricCard label="Low Stock" value={stats.low} icon="⚠️" color="amber" sub={`≤${LOW_STOCK_THRESHOLD} units`} alert={stats.low > 0} />
              <MetricCard label="Expired" value={stats.expired} icon="🚫" color="red" sub="Needs removal" alert={stats.expired > 0} />
              <MetricCard label="Expiring Soon" value={stats.expiringSoon} icon="⏳" color="orange" sub={`Within ${EXPIRY_WARNING_DAYS} days`} alert={stats.expiringSoon > 0} />
              <MetricCard label="Out of Stock" value={stats.outOfStock} icon="❌" color="slate" sub="Zero units" alert={stats.outOfStock > 0} />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Inventory by Category</h3>
              <div className="space-y-3">
                {Object.entries(stats.categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => {
                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-36 truncate">{cat}</span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                {Object.keys(stats.categoryBreakdown).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">No data yet. Add medicines to see analytics.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Stock Health</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Available</span>
                    <span className="font-semibold text-emerald-600">{stats.available}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Low Stock</span>
                    <span className="font-semibold text-amber-600">{stats.low}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Out of Stock</span>
                    <span className="font-semibold text-red-600">{stats.outOfStock}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Expiry Status</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Valid</span>
                    <span className="font-semibold text-emerald-600">
                      {medicines.filter((m) => !isExpired(m.expiryDate) && !isExpiringSoon(m.expiryDate)).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Expiring Soon</span>
                    <span className="font-semibold text-orange-600">{stats.expiringSoon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Expired</span>
                    <span className="font-semibold text-red-600">{stats.expired}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Profit Overview</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Inventory Cost</span>
                    <span className="font-semibold">{formatCurrencyCompact(stats.inventoryCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Sell Value</span>
                    <span className="font-semibold">{formatCurrencyCompact(stats.inventoryValue)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                    <span className="font-semibold">Potential Profit</span>
                    <span className={`font-bold ${stats.potentialProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrencyCompact(stats.potentialProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {totalAlerts > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold">Actionable Stock Alerts</h3>
                {alertMedicines.expired.length > 0 && (
                  <AlertSection
                    title="Expired Medicines"
                    color="red"
                    icon="🚫"
                    medicines={alertMedicines.expired}
                    badge={`${alertMedicines.expired.length} medicines`}
                    description="These medicines have passed their expiry date and must be removed from circulation immediately."
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onView={setViewingMedicine}
                  />
                )}
                {alertMedicines.expiringSoon.length > 0 && (
                  <AlertSection
                    title="Expiring Within 30 Days"
                    color="orange"
                    icon="⏳"
                    medicines={alertMedicines.expiringSoon}
                    badge={`${alertMedicines.expiringSoon.length} medicines`}
                    description="These medicines will expire within 30 days."
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onView={setViewingMedicine}
                  />
                )}
                {alertMedicines.lowStock.length > 0 && (
                  <AlertSection
                    title="Low Stock"
                    color="amber"
                    icon="⚠️"
                    medicines={alertMedicines.lowStock}
                    badge={`${alertMedicines.lowStock.length} medicines`}
                    description={`Stock quantity is ≤${LOW_STOCK_THRESHOLD} units.`}
                    onEdit={openEditForm}
                    onDelete={handleDelete}
                    onView={setViewingMedicine}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEDICINES CATALOGUE */}
        {activeTab === "medicines" && (
          <div className="rounded-2xl">
            <MedicinesPage darkMode={darkMode} />
          </div>
        )}

        {/* TAB 3: INVENTORY MANAGEMENT */}
        {activeTab === "inventory" && (
          <div className="rounded-2xl">
            <PharmacyInventoryPage />
          </div>
        )}

        {/* TAB 4: DISPENSING & PRESCRIPTIONS */}
        {activeTab === "dispensing" && (
          <div className="rounded-2xl">
            <PrescriptionPage darkMode={darkMode} />
          </div>
        )}
      </div>

      {viewingMedicine && (
        <MedicineViewModal medicine={viewingMedicine} onClose={() => setViewingMedicine(null)} onEdit={openEditForm} />
      )}
      {showForm && (
        <FormModal form={form} editingId={editingId} onChange={handleChange} onSubmit={handleSubmit} onClose={closeForm} />
      )}
      {showScanner && (
        <BarcodeScanner
          onScan={(code) => {
            setScannedCode(code);
            setShowScanner(false);
            setForm((prev) => ({ ...prev, medicineId: code, barcode: code }));
            openAddForm();
            showToast(`Barcode scanned: ${code}`, "success");
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

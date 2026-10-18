// FILE PATH: src/components/StockAlertPanel.jsx
//
// Dashboard summary cards + alert banners for the Pharmacy Inventory module.
// Pure presentational — receives the computed summary object as a prop.
//
// PROPS:
//   summary: {
//     totalMedicines, lowStockCount, outOfStockCount,
//     expiredCount, expiringSoonCount, totalValue
//   }

function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function StockAlertPanel({ summary }) {
  if (!summary) return null;

  const {
    totalMedicines,
    lowStockCount,
    outOfStockCount,
    expiredCount,
    expiringSoonCount,
    totalValue,
  } = summary;

  return (
    <div className="mb-6">
      {/* ── Dashboard Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card icon="📦" label="Total Medicines" value={totalMedicines} color="blue" />
        <Card icon="⚠️" label="Low Stock" value={lowStockCount} color="yellow" />
        <Card icon="⏰" label="Expiring Soon" value={expiringSoonCount} color="orange" />
        <Card icon="💰" label="Inventory Value" value={fmt(totalValue)} color="green" small />
      </div>

      {/* ── Alert Banners ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {outOfStockCount > 0 && (
          <Banner type="error">
            ❌ <strong>{outOfStockCount}</strong> medicine(s) are completely out of stock.
          </Banner>
        )}
        {lowStockCount > 0 && (
          <Banner type="warning">
            ⚠️ <strong>{lowStockCount}</strong> medicine(s) are running low — consider reordering.
          </Banner>
        )}
        {expiredCount > 0 && (
          <Banner type="error">
            🚫 <strong>{expiredCount}</strong> medicine(s) have already expired. Remove from active stock.
          </Banner>
        )}
        {expiringSoonCount > 0 && (
          <Banner type="warning">
            ⏰ <strong>{expiringSoonCount}</strong> medicine(s) will expire within 30 days.
          </Banner>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Card({ icon, label, value, color, small }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className={`font-bold leading-tight truncate ${small ? "text-lg" : "text-2xl"}`}>{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}

function Banner({ type, children }) {
  const styles = {
    warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
    error: "bg-red-50 border-red-400 text-red-800",
  };
  return (
    <div className={`border-l-4 px-4 py-3 rounded text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}
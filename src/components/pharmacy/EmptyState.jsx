export default function EmptyState({ hasFilters, onAddMedicine }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{hasFilters ? "🔍" : "💊"}</div>
      <h3 className="text-lg font-semibold text-slate-700">
        {hasFilters ? "No medicines match your filters" : "Pharmacy inventory is empty"}
      </h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
        {hasFilters
          ? "Try adjusting your search or filter criteria."
          : "Start by adding your first medicine to the inventory."}
      </p>
      {!hasFilters && onAddMedicine && (
        <button onClick={onAddMedicine} className="mt-4 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition">
          Add First Medicine
        </button>
      )}
    </div>
  );
}

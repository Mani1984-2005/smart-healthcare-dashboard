import StatusBadge from "./StatusBadge";

export default function DataTable({ columns, data, onRowClick, actions, emptyMessage = "No data available", isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-sm">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              {columns.map((col, ci) => (
                <div key={ci} className="h-4 bg-slate-100 rounded" style={{ width: col.width || 100 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/70 p-12 text-center shadow-sm">
        <div className="text-4xl mb-3 opacity-30">📋</div>
        <p className="text-slate-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {columns.map((col) => (
                <th key={col.key} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
              {actions && <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                className={`group transition-colors ${onRowClick ? "cursor-pointer" : ""} ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-indigo-50/30`}
              >
                {columns.map((col) => {
                  const val = col.render ? col.render(row) : row[col.key];
                  return (
                    <td key={col.key} className="px-5 py-3.5 text-slate-700">
                      {col.badge ? <StatusBadge status={val} /> : val}
                    </td>
                  );
                })}
                {actions && (
                  <td className="px-5 py-3.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-end gap-1.5">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BarList({ items, valueKey = 'count', labelKey = 'name', colorClass = 'bg-clinical-400' }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-ink-faint py-4">No data yet.</p>;
  }
  const max = Math.max(...items.map((i) => i[valueKey]), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-ink dark:text-ink-faint truncate pr-2">{item[labelKey]}</span>
            <span className="font-mono text-ink-faint shrink-0">{item[valueKey]}</span>
          </div>
          <div className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${Math.max(4, (item[valueKey] / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

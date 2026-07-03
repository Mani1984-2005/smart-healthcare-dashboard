import clsx from 'clsx';

export function ConfidenceBadge({ value, size = 'md' }) {
  if (value === null || value === undefined) return null;
  const pct = Math.round(value * 100);
  const tone =
    pct >= 80
      ? 'text-clinical-700 bg-clinical-50 dark:bg-clinical-900/40 dark:text-clinical-300'
      : pct >= 50
      ? 'text-warning bg-yellow-50 dark:bg-yellow-950/30'
      : 'text-danger bg-red-50 dark:bg-red-950/30';

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-mono font-medium',
        size === 'sm' ? 'text-[0.65rem] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        tone
      )}
    >
      {pct}% confidence
    </span>
  );
}

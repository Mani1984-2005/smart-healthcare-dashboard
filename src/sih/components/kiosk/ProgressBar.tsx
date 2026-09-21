type ProgressBarProps = { percentComplete: number };

export default function ProgressBar({ percentComplete }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, percentComplete)) * 100);
  return (
    <div className="w-full" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-cyan-700 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{pct}% complete</p>
    </div>
  );
}

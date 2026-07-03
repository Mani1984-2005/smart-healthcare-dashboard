import clsx from 'clsx';

const SEVERITY_CONFIG = {
  minor: { label: 'Minor', classes: 'text-trust-700 bg-trust-50 dark:bg-trust-900/40 dark:text-trust-300' },
  moderate: { label: 'Moderate', classes: 'text-warning bg-yellow-50 dark:bg-yellow-950/30' },
  major: { label: 'Major', classes: 'text-danger bg-red-50 dark:bg-red-950/30' },
  contraindicated: { label: 'Contraindicated', classes: 'text-white bg-danger dark:bg-red-700' },
};

export function SeverityBadge({ severity }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.minor;
  return (
    <span className={clsx('inline-flex items-center rounded-full text-[0.65rem] font-semibold uppercase tracking-wide px-2 py-0.5', config.classes)}>
      {config.label}
    </span>
  );
}

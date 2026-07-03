import { ShieldAlert, ShieldCheck, ShieldQuestion, Skull } from 'lucide-react';
import clsx from 'clsx';

const RISK_CONFIG = {
  low: { label: 'Low risk', icon: ShieldCheck, classes: 'text-clinical-700 bg-clinical-50 dark:bg-clinical-900/40 dark:text-clinical-300' },
  medium: { label: 'Medium risk', icon: ShieldQuestion, classes: 'text-warning bg-yellow-50 dark:bg-yellow-950/30' },
  high: { label: 'High risk', icon: ShieldAlert, classes: 'text-danger bg-red-50 dark:bg-red-950/30' },
  critical: { label: 'Critical risk', icon: Skull, classes: 'text-white bg-danger dark:bg-red-700' },
};

export function RiskBadge({ level, size = 'md' }) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.low;
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span className={clsx('inline-flex items-center rounded-full font-semibold uppercase tracking-wide', sizeClasses, config.classes)}>
      <Icon size={size === 'sm' ? 12 : 13} />
      {config.label}
    </span>
  );
}

import { Zap, Copy, ShieldAlert, Ban } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';

function AlertShell({ icon: Icon, tone, title, count, children }) {
  if (count === 0) return null;
  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-border dark:border-border-dark ${tone}`}>
        <Icon size={15} />
        <p className="text-sm font-semibold">
          {title} ({count})
        </p>
      </div>
      <div className="divide-y divide-border dark:divide-border-dark">{children}</div>
    </div>
  );
}

export function InteractionAlerts({ interactions }) {
  return (
    <AlertShell icon={Zap} tone="text-warning bg-yellow-50 dark:bg-yellow-950/20" title="Drug interactions" count={interactions.length}>
      {interactions.map((i, idx) => (
        <div key={idx} className="px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-ink dark:text-white">
              {i.medicineA} + {i.medicineB}
            </p>
            <SeverityBadge severity={i.severity} />
          </div>
          <p className="text-xs text-ink-light dark:text-ink-faint leading-relaxed">{i.description}</p>
        </div>
      ))}
    </AlertShell>
  );
}

export function AllergyAlerts({ allergyWarnings }) {
  return (
    <AlertShell icon={Ban} tone="text-white bg-danger" title="Allergy warnings" count={allergyWarnings.length}>
      {allergyWarnings.map((a, idx) => (
        <div key={idx} className="px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-ink dark:text-white">{a.medicineName}</p>
            <SeverityBadge severity={a.severity} />
          </div>
          <p className="text-xs text-ink-light dark:text-ink-faint leading-relaxed">{a.description}</p>
        </div>
      ))}
    </AlertShell>
  );
}

export function DuplicateAlerts({ duplicates }) {
  return (
    <AlertShell icon={Copy} tone="text-trust-700 bg-trust-50 dark:bg-trust-900/30 dark:text-trust-300" title="Possible duplicate medicines" count={duplicates.length}>
      {duplicates.map((d, idx) => (
        <div key={idx} className="px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-ink dark:text-white">{d.medicineName}</p>
          <p className="text-xs text-ink-faint font-mono">appears {d.occurrenceCount}×</p>
        </div>
      ))}
    </AlertShell>
  );
}

export function ContraindicationAlerts({ contraindications }) {
  return (
    <AlertShell icon={ShieldAlert} tone="text-danger bg-red-50 dark:bg-red-950/20" title="Contraindication flags" count={contraindications.length}>
      {contraindications.map((c, idx) => (
        <div key={idx} className="px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-ink dark:text-white">
              {c.medicineName} — {c.condition}
            </p>
            <SeverityBadge severity={c.severity} />
          </div>
          <p className="text-xs text-ink-light dark:text-ink-faint leading-relaxed">{c.description}</p>
        </div>
      ))}
    </AlertShell>
  );
}

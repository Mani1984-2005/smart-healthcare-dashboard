import { useState } from 'react';
import { ChevronDown, Pill, Clock, CalendarDays, Syringe, AlertOctagon, Lock } from 'lucide-react';
import clsx from 'clsx';
import { ConfidenceBadge } from './ConfidenceBadge';
import { getMedicineById } from '../../data/medicineInfoLookup';

export function MedicineResultCard({ medicine }) {
  const [expanded, setExpanded] = useState(false);
  const info = getMedicineById(medicine.medicineKey || medicine.medicineId);

  const facts = [
    medicine.dosage && { icon: Pill, label: medicine.dosage },
    medicine.frequency && { icon: Clock, label: medicine.frequency },
    medicine.duration && { icon: CalendarDays, label: medicine.duration },
    medicine.route && { icon: Syringe, label: medicine.route },
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="h-9 w-9 shrink-0 rounded-lg bg-clinical-50 dark:bg-clinical-900/40 text-clinical-600 dark:text-clinical-300 flex items-center justify-center">
          <Pill size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm text-ink dark:text-white">{medicine.genericName}</p>
            {medicine.isHighRisk && (
              <span className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-danger bg-red-50 dark:bg-red-950/30 rounded-full px-2 py-0.5">
                <AlertOctagon size={11} /> High risk
              </span>
            )}
            {medicine.isControlled && (
              <span className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-light bg-black/5 dark:bg-white/5 rounded-full px-2 py-0.5">
                <Lock size={11} /> Controlled
              </span>
            )}
          </div>
          <p className="text-xs text-ink-faint mt-0.5">{medicine.category}</p>
          {facts.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {facts.map((f, i) => (
                <span key={i} className="flex items-center gap-1 text-xs text-ink-light dark:text-ink-faint font-mono">
                  <f.icon size={12} /> {f.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <ConfidenceBadge value={medicine.confidence} size="sm" />
        <ChevronDown size={16} className={clsx('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border dark:border-border-dark space-y-3">
          <p className="text-xs font-mono text-ink-faint">OCR line: "{medicine.rawText}"</p>

          {info?.brandNames?.length > 0 && (
            <DetailBlock title="Brand names">
              <p className="text-sm text-ink dark:text-ink-faint">{info.brandNames.join(', ')}</p>
            </DetailBlock>
          )}

          {info?.sideEffects?.length > 0 && (
            <DetailBlock title="Side effects">
              <ul className="text-sm text-ink dark:text-ink-faint list-disc list-inside space-y-0.5">
                {info.sideEffects.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </DetailBlock>
          )}

          {info?.precautions?.length > 0 && (
            <DetailBlock title="Precautions">
              <ul className="text-sm text-ink dark:text-ink-faint list-disc list-inside space-y-0.5">
                {info.precautions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </DetailBlock>
          )}

          {info?.contraindications?.length > 0 && (
            <DetailBlock title="Contraindications">
              <ul className="text-sm text-danger list-disc list-inside space-y-0.5">
                {info.contraindications.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </DetailBlock>
          )}
        </div>
      )}
    </div>
  );
}

function DetailBlock({ title, children }) {
  return (
    <div>
      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint mb-1">{title}</p>
      {children}
    </div>
  );
}

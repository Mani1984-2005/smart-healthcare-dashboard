import { User, Stethoscope, FileHeart, Sparkles } from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import { ConfidenceBadge } from './ConfidenceBadge';

export function AiSummaryPanel({ analysis }) {
  const fields = [
    { icon: User, label: 'Patient', value: analysis.patientName, confidence: analysis.patientNameConfidence },
    { icon: Stethoscope, label: 'Doctor', value: analysis.doctorName, confidence: analysis.doctorNameConfidence },
    { icon: FileHeart, label: 'Diagnosis', value: analysis.diagnosis, confidence: analysis.diagnosisConfidence },
  ];

  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-clinical-600 dark:text-clinical-300" />
          <p className="font-display font-semibold text-ink dark:text-white">AI Clinical Analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge value={analysis.overallConfidence} />
          <RiskBadge level={analysis.riskLevel} />
        </div>
      </div>

      <dl className="grid sm:grid-cols-3 gap-3 mb-4">
        {fields.map((f) => (
          <div key={f.label} className="rounded-lg bg-paper dark:bg-paper-dark border border-border dark:border-border-dark p-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint mb-1">
              <f.icon size={12} /> {f.label}
            </dt>
            <dd className="text-sm text-ink dark:text-white truncate">{f.value || 'Not detected'}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm leading-relaxed text-ink-light dark:text-ink-faint">{analysis.summary}</p>
    </div>
  );
}

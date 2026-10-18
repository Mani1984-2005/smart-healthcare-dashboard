import { FileSearch } from 'lucide-react';
import { PrescriptionCard } from './PrescriptionCard';
import { Spinner } from '../common/Spinner';

export function PrescriptionList({ prescriptions, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-ink-faint gap-3">
        <Spinner size={26} />
        <p className="text-sm">Loading prescription records…</p>
      </div>
    );
  }

  if (!prescriptions || prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.03] dark:bg-white/[0.04] text-ink-faint mb-3">
          <FileSearch size={24} />
        </span>
        <p className="font-medium text-ink dark:text-white">No prescriptions yet</p>
        <p className="text-sm text-ink-light dark:text-ink-faint mt-1 max-w-xs">
          Upload a prescription image, PDF, or camera capture to see it appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {prescriptions.map((p, i) => (
        <PrescriptionCard key={p.id} prescription={p} index={i} />
      ))}
    </div>
  );
}

import { useState } from 'react';
import { Sparkles, X, Plus } from 'lucide-react';
import { Spinner } from '../common/Spinner';

export function AnalyzeButton({ onAnalyze, isAnalyzing, label = 'Run AI Analysis' }) {
  const [allergies, setAllergies] = useState([]);
  const [draft, setDraft] = useState('');

  function addAllergy() {
    const value = draft.trim();
    if (value && !allergies.includes(value.toLowerCase())) {
      setAllergies((prev) => [...prev, value.toLowerCase()]);
    }
    setDraft('');
  }

  function removeAllergy(value) {
    setAllergies((prev) => prev.filter((a) => a !== value));
  }

  return (
    <div className="rounded-xl border border-dashed border-border dark:border-border-dark bg-paper dark:bg-paper-dark p-4 sm:p-5">
      <p className="text-sm font-medium text-ink dark:text-white mb-1">AI Clinical Analysis</p>
      <p className="text-xs text-ink-faint mb-3">
        Extract medicines, dosages, and check for interactions, duplicates, and allergy conflicts — fully offline.
      </p>

      <label className="block text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint mb-1.5">
        Known allergies (optional)
      </label>
      <div className="flex items-center gap-2 mb-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addAllergy();
            }
          }}
          placeholder="e.g. penicillin, sulfa"
          className="flex-1 rounded-lg border border-border dark:border-border-dark bg-white dark:bg-surface-dark px-3 py-2 text-sm text-ink dark:text-white placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-clinical-400"
        />
        <button
          type="button"
          onClick={addAllergy}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border dark:border-border-dark text-ink-light hover:text-clinical-600 hover:border-clinical-400 transition-colors shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>

      {allergies.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {allergies.map((a) => (
            <span
              key={a}
              className="flex items-center gap-1 rounded-full bg-white dark:bg-surface-dark border border-border dark:border-border-dark px-2.5 py-1 text-xs text-ink dark:text-ink-faint"
            >
              {a}
              <button onClick={() => removeAllergy(a)} className="text-ink-faint hover:text-danger">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => onAnalyze(allergies)}
        disabled={isAnalyzing}
        className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-lg bg-clinical-500 hover:bg-clinical-600 text-white text-sm font-medium px-4 py-2.5 transition-colors shadow-card disabled:opacity-60"
      >
        {isAnalyzing ? <Spinner size={15} /> : <Sparkles size={15} />}
        {isAnalyzing ? 'Analyzing…' : label}
      </button>
    </div>
  );
}

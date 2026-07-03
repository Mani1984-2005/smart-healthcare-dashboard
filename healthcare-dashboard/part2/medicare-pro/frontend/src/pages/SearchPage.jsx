import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { Spinner } from '../components/common/Spinner';
import { RiskBadge } from '../components/ai/RiskBadge';
import { advancedSearch } from '../api/search';

const RISK_OPTIONS = [
  { value: '', label: 'Any risk' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const EMPTY_FILTERS = { q: '', medicineName: '', patientName: '', doctorName: '', diagnosis: '', riskLevel: '' };

export function SearchPage({ pushToast }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const res = await advancedSearch(filters, page, 20);
        setResults(res.data);
        setPagination(res.pagination);
        setHasSearched(true);
      } catch (err) {
        pushToast(err.friendlyMessage || 'Search failed.', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pushToast]
  );

  useEffect(() => {
    runSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink dark:text-white tracking-tight">
          Advanced search
        </h1>
        <p className="text-sm text-ink-faint mt-1">Search AI-analyzed prescriptions by medicine, patient, doctor, diagnosis, or risk.</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onSubmit={handleSubmit}
        className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4 sm:p-5 mb-6 space-y-3"
      >
        <div className="relative">
          <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Search patient, doctor, diagnosis, or medicine…"
            className="w-full rounded-lg border border-border dark:border-border-dark bg-paper dark:bg-paper-dark pl-9 pr-3 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-clinical-400"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <FilterInput label="Medicine" value={filters.medicineName} onChange={(v) => updateFilter('medicineName', v)} placeholder="e.g. Metformin" />
          <FilterInput label="Patient name" value={filters.patientName} onChange={(v) => updateFilter('patientName', v)} placeholder="e.g. John Carter" />
          <FilterInput label="Doctor name" value={filters.doctorName} onChange={(v) => updateFilter('doctorName', v)} placeholder="e.g. Dr. Reyes" />
          <FilterInput label="Diagnosis" value={filters.diagnosis} onChange={(v) => updateFilter('diagnosis', v)} placeholder="e.g. Hypertension" />
        </div>

        <div>
          <label className="block text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint mb-1.5">Risk level</label>
          <div className="flex flex-wrap gap-1.5">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFilter('riskLevel', opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  filters.riskLevel === opt.value
                    ? 'bg-clinical-500 border-clinical-500 text-white'
                    : 'border-border dark:border-border-dark text-ink-light dark:text-ink-faint hover:border-clinical-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="rounded-lg bg-clinical-500 hover:bg-clinical-600 text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-ink-light hover:text-ink dark:text-ink-faint dark:hover:text-white transition-colors px-3 py-2.5"
          >
            <X size={13} /> Clear filters
          </button>
        </div>
      </motion.form>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size={22} className="text-clinical-500" />
        </div>
      ) : (
        <>
          {pagination && (
            <p className="text-xs text-ink-faint font-mono mb-3">{pagination.total} result{pagination.total === 1 ? '' : 's'}</p>
          )}
          <div className="space-y-2.5">
            {results.map((r) => (
              <Link
                key={r.analysisId}
                to={`/prescriptions/${r.prescriptionId}`}
                className="block rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4 hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="text-sm font-medium text-ink dark:text-white truncate">
                    {r.patientName || r.originalFilename}
                  </p>
                  <RiskBadge level={r.riskLevel} size="sm" />
                </div>
                <p className="text-xs text-ink-faint mb-2">
                  {r.doctorName ? `${r.doctorName} · ` : ''}
                  {r.diagnosis || 'No diagnosis recorded'}
                </p>
                {r.medicineNames?.length > 0 && (
                  <p className="text-xs font-mono text-ink-light dark:text-ink-faint truncate">
                    {r.medicineNames.join(', ')}
                  </p>
                )}
              </Link>
            ))}
            {hasSearched && results.length === 0 && (
              <p className="text-sm text-ink-faint py-8 text-center">No matching prescriptions found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[0.65rem] font-medium uppercase tracking-wide text-ink-faint mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border dark:border-border-dark bg-paper dark:bg-paper-dark px-3 py-2 text-sm text-ink dark:text-white placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-clinical-400"
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PrescriptionList } from '../components/prescriptions/PrescriptionList';
import { fetchPrescriptions } from '../api/prescriptions';

export function PrescriptionsPage({ pushToast }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetchPrescriptions(1, 50);
        if (!cancelled) {
          setPrescriptions(res.data);
          setPagination(res.pagination);
        }
      } catch (err) {
        if (!cancelled) pushToast(err.friendlyMessage || 'Failed to load prescriptions.', 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink dark:text-white tracking-tight">
            Prescription records
          </h1>
          {pagination && (
            <p className="text-sm text-ink-faint mt-1 font-mono">{pagination.total} total</p>
          )}
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-lg bg-clinical-500 hover:bg-clinical-600 text-white text-sm font-medium px-3.5 py-2.5 transition-colors shadow-card shrink-0"
        >
          <Plus size={16} /> <span className="hidden sm:inline">New upload</span>
        </Link>
      </motion.div>

      <PrescriptionList prescriptions={prescriptions} isLoading={isLoading} />
    </div>
  );
}

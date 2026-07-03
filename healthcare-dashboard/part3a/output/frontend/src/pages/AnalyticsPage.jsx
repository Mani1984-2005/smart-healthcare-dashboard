import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, Sparkles, AlertTriangle, ShieldAlert, Copy, Percent } from 'lucide-react';
import { Spinner } from '../components/common/Spinner';
import { RiskBadge } from '../components/ai/RiskBadge';
import { BarList } from '../components/ai/BarList';
import { fetchAnalyticsDashboard } from '../api/analytics';

const RISK_ORDER = ['low', 'medium', 'high', 'critical'];
const RISK_COLORS = {
  low: 'bg-clinical-400',
  medium: 'bg-yellow-400',
  high: 'bg-red-400',
  critical: 'bg-red-700',
};

export function AnalyticsPage({ pushToast }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await fetchAnalyticsDashboard();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) pushToast(err.friendlyMessage || 'Failed to load analytics.', 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size={26} className="text-clinical-500" />
      </div>
    );
  }

  if (!data) return null;

  const { totals, riskDistribution, topMedicines, topInteractions, recentHighRiskAnalyses } = data;
  const maxTrendCount = Math.max(...data.analysesOverTime.map((d) => d.count), 1);

  const statCards = [
    { icon: FileText, label: 'Prescriptions', value: totals.totalPrescriptions },
    { icon: Sparkles, label: 'AI Analyses', value: totals.totalAnalyses },
    { icon: Percent, label: 'Avg. confidence', value: `${Math.round(totals.avgConfidence * 100)}%` },
    { icon: AlertTriangle, label: 'Interactions found', value: totals.totalInteractions },
    { icon: ShieldAlert, label: 'Allergy warnings', value: totals.totalAllergyWarnings },
    { icon: Copy, label: 'Duplicate flags', value: totals.totalDuplicates },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink dark:text-white tracking-tight">
          Analytics dashboard
        </h1>
        <p className="text-sm text-ink-faint mt-1">Aggregated insight across every AI-analyzed prescription.</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {statCards.map((s, idx) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4"
          >
            <s.icon size={16} className="text-clinical-600 dark:text-clinical-300 mb-2" />
            <p className="text-xl font-semibold text-ink dark:text-white font-display">{s.value}</p>
            <p className="text-xs text-ink-faint mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4 sm:p-5"
        >
          <p className="text-sm font-semibold text-ink dark:text-white mb-3">Risk level distribution</p>
          <div className="space-y-2.5">
            {RISK_ORDER.map((level) => {
              const count = riskDistribution[level] || 0;
              const max = Math.max(...RISK_ORDER.map((l) => riskDistribution[l] || 0), 1);
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <RiskBadge level={level} size="sm" />
                    <span className="text-xs font-mono text-ink-faint">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${RISK_COLORS[level]}`}
                      style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4 sm:p-5"
        >
          <p className="text-sm font-semibold text-ink dark:text-white mb-3">Analyses — last 30 days</p>
          <div className="flex items-end gap-1 h-28">
            {data.analysesOverTime.length === 0 ? (
              <p className="text-sm text-ink-faint">No analyses yet.</p>
            ) : (
              data.analysesOverTime.map((d, idx) => (
                <div
                  key={idx}
                  title={`${d.date}: ${d.count}`}
                  className="flex-1 bg-clinical-400 rounded-t-sm min-w-[3px]"
                  style={{ height: `${Math.max(6, (d.count / maxTrendCount) * 100)}%` }}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4 sm:p-5"
        >
          <p className="text-sm font-semibold text-ink dark:text-white mb-3">Most prescribed medicines</p>
          <BarList items={topMedicines} labelKey="name" valueKey="count" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4 sm:p-5"
        >
          <p className="text-sm font-semibold text-ink dark:text-white mb-3">Most common interactions</p>
          {topInteractions.length === 0 ? (
            <p className="text-sm text-ink-faint py-4">No interactions found yet.</p>
          ) : (
            <div className="space-y-2">
              {topInteractions.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-ink dark:text-ink-faint truncate pr-2">
                    {i.medicineA} + {i.medicineB}
                  </span>
                  <span className="text-xs font-mono text-ink-faint shrink-0">{i.count}×</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-sm font-semibold text-ink dark:text-white mb-3">Recent high-risk prescriptions</p>
        <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark divide-y divide-border dark:divide-border-dark">
          {recentHighRiskAnalyses.length === 0 ? (
            <p className="p-4 text-sm text-ink-faint">None — nothing high-risk detected recently.</p>
          ) : (
            recentHighRiskAnalyses.map((r) => (
              <Link
                key={r.analysisId}
                to={`/prescriptions/${r.prescriptionId}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink dark:text-white truncate">{r.patientName || r.originalFilename}</p>
                  <p className="text-xs text-ink-faint font-mono">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <RiskBadge level={r.riskLevel} size="sm" />
              </Link>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

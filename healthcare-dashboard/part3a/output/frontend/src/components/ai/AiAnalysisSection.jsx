import { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AnalyzeButton } from './AnalyzeButton';
import { AiSummaryPanel } from './AiSummaryPanel';
import { MedicineResultCard } from './MedicineResultCard';
import { InteractionAlerts, AllergyAlerts, DuplicateAlerts, ContraindicationAlerts } from './SafetyAlerts';
import { Spinner } from '../common/Spinner';
import { runAiAnalysis, fetchAiAnalysis } from '../../api/aiAnalysis';

export function AiAnalysisSection({ prescription, pushToast }) {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAiAnalysis(prescription.id);
      setAnalysis(data);
    } catch (err) {
      if (err.response?.status !== 404) {
        pushToast(err.friendlyMessage || 'Failed to load AI analysis.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [prescription.id, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAnalyze(knownAllergies) {
    setIsAnalyzing(true);
    try {
      const data = await runAiAnalysis(prescription.id, knownAllergies);
      setAnalysis(data);
      pushToast('AI analysis complete.', 'success');
    } catch (err) {
      pushToast(err.friendlyMessage || 'AI analysis failed.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (prescription.status !== 'ocr_complete') {
    return (
      <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4 flex items-center gap-3">
        <AlertCircle size={18} className="text-ink-faint shrink-0" />
        <p className="text-sm text-ink-light dark:text-ink-faint">
          AI analysis becomes available once OCR text extraction completes.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size={22} className="text-clinical-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnalyzeButton
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        label={analysis ? 'Re-run AI Analysis' : 'Run AI Analysis'}
      />

      {analysis && (
        <>
          <AiSummaryPanel analysis={analysis} />

          <AllergyAlerts allergyWarnings={analysis.allergyWarnings} />
          <ContraindicationAlerts contraindications={analysis.contraindications} />
          <InteractionAlerts interactions={analysis.interactions} />
          <DuplicateAlerts duplicates={analysis.duplicates} />

          {analysis.medicines.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-2">
                Extracted medicines ({analysis.medicines.length})
              </p>
              <div className="space-y-2">
                {analysis.medicines.map((med) => (
                  <MedicineResultCard key={med.id || med.rawText} medicine={med} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

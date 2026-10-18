// src/components/ai/AIInsightPanel.jsx
import { useMemo } from "react";
import { aiClinicalInsight } from "../../utils/aiEngine";

export default function AIInsightPanel({ patient, staffList = [], darkMode }) {
  const insight = useMemo(() => aiClinicalInsight(patient || {}, staffList), [patient, staffList]);

  const bg = darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900";
  const muted = darkMode ? "text-slate-300" : "text-slate-600";

  return (
    <div className={`${bg} rounded-2xl p-5 shadow`}>
      <h3 className="text-lg font-bold mb-3">AI Clinical Insight</h3>
      <div className={`text-sm space-y-2 ${muted}`}>
        <div><span className="font-semibold">Mapped Condition:</span> {insight.mappedDisease}</div>
        <div><span className="font-semibold">Specialty:</span> {insight.specialty}</div>
        <div><span className="font-semibold">Confidence:</span> {insight.confidence}%</div>
        <div><span className="font-semibold">Risk Score:</span> {insight.riskScore}/10</div>
        <div><span className="font-semibold">Risk Band:</span> {insight.riskBand}</div>
      </div>

      {insight.alerts.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {insight.alerts.map((a) => (
            <div key={a}>• {a}</div>
          ))}
        </div>
      )}
    </div>
  );
}
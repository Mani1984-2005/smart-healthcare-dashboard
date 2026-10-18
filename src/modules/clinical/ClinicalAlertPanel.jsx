// src/components/patient/ClinicalAlertPanel.jsx
// MediCare Pro — Clinical Alert Panel
//
// Displays:
//  1. Rule-based clinical observations (instant, from inferClinicalObservations)
//  2. Risk factor breakdown (from computeRiskScore)
//  3. AI-generated narrative summary (async, from generateAISummary)
//  4. Differential suggestions
//  5. Recommended actions
//
// Props:
//  patient   – patient record object
//  darkMode  – boolean
//  showAI    – boolean (default true) — whether to call the AI API

import { useState, useEffect, useCallback } from "react";
import computeRiskScore, { RISK_LEVELS }    from "../../utils/riskEngine";
import { inferClinicalObservations, suggestDifferentials, generateAISummary } from "../../utils/clinicalAI";
import { buildTrendsSummary, healthScoreCategory } from "../../utils/healthTrends";

// ─── Sub-components ───────────────────────────────────────────────────────────

const severityConfig = (type, severity) => {
  if (type === "critical" || severity >= 5)
    return { border: "border-red-500",    bg: "bg-red-950/30",    icon: "🚨", badge: "bg-red-600 text-white",    label: "CRITICAL" };
  if (type === "warning"  || severity >= 3)
    return { border: "border-amber-400",  bg: "bg-amber-950/20",  icon: "⚠️", badge: "bg-amber-500 text-white",  label: "WARNING"  };
  if (type === "suggestion")
    return { border: "border-blue-400",   bg: "bg-blue-950/20",   icon: "💡", badge: "bg-blue-500 text-white",   label: "SUGGEST"  };
  return   { border: "border-slate-500",  bg: "bg-slate-800/30",  icon: "ℹ️", badge: "bg-slate-500 text-white",  label: "INFO"     };
};

const urgencyColors = {
  Emergency: "bg-red-600 text-white",
  Urgent:    "bg-amber-500 text-white",
  Routine:   "bg-green-600 text-white",
};

const categoryIcon = { priority: "🔴", status: "🏥", age: "👴", chronic: "🩺", allergy: "💊", vitals: "💓", lifestyle: "🚬", special: "⭐" };

// ─── ObservationCard ─────────────────────────────────────────────────────────

function ObservationCard({ obs, darkMode }) {
  const cfg = severityConfig(obs.type, obs.severity);
  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${cfg.border} ${cfg.bg}`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
          <span className={`text-[10px] font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Severity {obs.severity}/5</span>
        </div>
        <p className={`text-sm ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{obs.message}</p>
      </div>
    </div>
  );
}

// ─── RiskBreakdown ────────────────────────────────────────────────────────────

function RiskBreakdown({ riskResult, darkMode }) {
  const [expanded, setExpanded] = useState(false);
  const { score, level, factors, recommendations } = riskResult;

  const levelColors = {
    Critical: "text-red-500",
    High:     "text-orange-500",
    Medium:   "text-yellow-500",
    Low:      "text-green-500",
  };

  const barWidth = Math.min(100, Math.round((score / 200) * 100));

  return (
    <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
      {/* Score header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Risk Score</p>
          <p className={`text-3xl font-extrabold leading-tight ${levelColors[level] || "text-slate-500"}`}>
            {score} <span className="text-base font-bold">{level}</span>
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
        >
          {expanded ? "Hide Breakdown" : "Show Breakdown"}
        </button>
      </div>

      {/* Progress bar */}
      <div className={`h-2 rounded-full mb-3 overflow-hidden ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
        <div
          className={`h-full rounded-full transition-all ${
            level === "Critical" ? "bg-red-600" :
            level === "High"     ? "bg-orange-500" :
            level === "Medium"   ? "bg-yellow-500" : "bg-green-500"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Factor breakdown (expandable) */}
      {expanded && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Contributing Factors</p>
          {factors.length === 0 ? (
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>No risk factors identified.</p>
          ) : (
            factors.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm">{categoryIcon[f.category] || "•"}</span>
                <span className={`flex-1 text-xs ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{f.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  f.weight >= 40 ? "bg-red-100 text-red-700" :
                  f.weight >= 20 ? "bg-orange-100 text-orange-700" :
                  "bg-slate-100 text-slate-600"
                }`}>+{f.weight}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Recommended Actions</p>
          <div className="space-y-1">
            {recommendations.map((r, i) => (
              <div key={i} className={`flex gap-2 text-xs p-2 rounded-lg ${
                r.priority === "urgent" ? (darkMode ? "bg-red-950/40 text-red-300"     : "bg-red-50 text-red-700") :
                r.priority === "high"   ? (darkMode ? "bg-amber-950/40 text-amber-300" : "bg-amber-50 text-amber-700") :
                                          (darkMode ? "bg-slate-700 text-slate-400"    : "bg-slate-50 text-slate-600")
              }`}>
                <span>{r.priority === "urgent" ? "🔴" : r.priority === "high" ? "🟡" : "🟢"}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AICard ──────────────────────────────────────────────────────────────────

function AICard({ summary, loading, error, darkMode }) {
  if (loading) return (
    <div className={`p-6 rounded-xl border text-center ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Generating AI clinical summary…</p>
    </div>
  );

  if (error) return (
    <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
      <p className="text-sm">⚠️ AI summary unavailable. Rule-based analysis shown above.</p>
    </div>
  );

  if (!summary) return null;

  return (
    <div className={`p-5 rounded-xl border space-y-4 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <p className="font-bold text-sm">AI Clinical Summary</p>
          {summary._source === "rule-based-fallback" && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
              Offline Mode
            </span>
          )}
        </div>
        {summary.urgencyLevel && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyColors[summary.urgencyLevel] || "bg-slate-500 text-white"}`}>
            {summary.urgencyLevel}
          </span>
        )}
      </div>

      {/* Narrative summary */}
      {summary.summary && (
        <p className={`text-sm leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{summary.summary}</p>
      )}

      {/* Key findings */}
      {summary.keyFindings?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Key Findings</p>
          <ul className="space-y-1">
            {summary.keyFindings.map((f, i) => (
              <li key={i} className={`text-xs flex gap-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                <span className="text-cyan-500 font-bold">→</span>{f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk narrative */}
      {summary.riskNarrative && (
        <div className={`p-3 rounded-lg text-xs ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-50 text-slate-700"}`}>
          <span className="font-bold">Risk Assessment: </span>{summary.riskNarrative}
        </div>
      )}

      {/* Recommended actions */}
      {summary.recommendedActions?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Recommended Actions</p>
          <div className="space-y-1">
            {summary.recommendedActions.map((a, i) => (
              <div key={i} className={`text-xs p-2 rounded-lg flex gap-2 ${
                darkMode ? "bg-cyan-950/30 text-cyan-300 border border-cyan-800" : "bg-cyan-50 text-cyan-800 border border-cyan-200"
              }`}>
                <span>{i + 1}.</span><span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Differentials */}
      {summary.differentialsNote && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Differential Considerations</p>
          <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{summary.differentialsNote}</p>
        </div>
      )}

      {/* Follow-up */}
      {summary.followUpInterval && (
        <div className={`flex items-center gap-2 text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          <span>📅</span>
          <span>Suggested follow-up: <strong>{summary.followUpInterval}</strong></span>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ClinicalAlertPanel({ patient, darkMode, showAI = true }) {
  const [aiSummary, setAiSummary]   = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError,   setAiError]     = useState(false);
  const [activeSection, setActive]  = useState("observations");

  // Computed synchronously
  const observations  = inferClinicalObservations(patient);
  const riskResult    = computeRiskScore(patient);
  const differentials = suggestDifferentials(patient.disease);
  const trendsSummary = buildTrendsSummary(patient, riskResult);
  const healthCat     = healthScoreCategory(trendsSummary.healthScore);

  // Count by severity
  const criticalCount  = observations.filter((o) => o.severity >= 5).length;
  const warningCount   = observations.filter((o) => o.severity >= 3 && o.severity < 5).length;

  const loadAI = useCallback(async () => {
    if (!showAI || aiSummary || aiLoading) return;
    setAiLoading(true);
    setAiError(false);
    try {
      const summary = await generateAISummary(patient);
      setAiSummary(summary);
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [patient, showAI, aiSummary, aiLoading]);

  // Auto-load AI when the AI section is opened
  useEffect(() => {
    if (activeSection === "ai") loadAI();
  }, [activeSection, loadAI]);

  const sections = [
    { id: "observations", label: `Observations (${observations.length})`, icon: "🔍" },
    { id: "risk",         label: `Risk Score (${riskResult.score})`,      icon: "📊" },
    { id: "differentials",label: "Differentials",                         icon: "🩺" },
    { id: "health",       label: `Health Score (${trendsSummary.healthScore})`, icon: "💚" },
    ...(showAI ? [{ id: "ai", label: "AI Summary", icon: "🤖" }] : []),
  ];

  const panelBg  = darkMode ? "bg-slate-900 border-slate-700"  : "bg-slate-50 border-slate-200";
  const tabActive= "bg-cyan-600 text-white";
  const tabInact = darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100";

  return (
    <div className={`rounded-2xl border ${panelBg} overflow-hidden`}>

      {/* ── Alert Summary Banner ── */}
      {(criticalCount > 0 || warningCount > 0) && (
        <div className={`flex flex-wrap gap-3 p-4 border-b items-center ${
          criticalCount > 0
            ? "bg-red-950/30 border-red-800"
            : "bg-amber-950/20 border-amber-700"
        }`}>
          <span className="text-2xl">{criticalCount > 0 ? "🚨" : "⚠️"}</span>
          <div>
            <p className={`font-bold text-sm ${criticalCount > 0 ? "text-red-400" : "text-amber-400"}`}>
              {criticalCount > 0 ? `${criticalCount} Critical Alert${criticalCount > 1 ? "s" : ""}` : `${warningCount} Warning${warningCount > 1 ? "s" : ""}`}
            </p>
            <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Auto-detected from patient record. Physician review recommended.
            </p>
          </div>
        </div>
      )}

      {/* ── Section Tabs ── */}
      <div className={`flex flex-wrap gap-1 px-4 pt-3 pb-0 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
        {sections.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all ${
              activeSection === id ? tabActive : tabInact
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="p-4 space-y-3">

        {/* Observations */}
        {activeSection === "observations" && (
          observations.length === 0 ? (
            <div className={`text-center py-10 rounded-xl border-2 border-dashed ${
              darkMode ? "border-green-800 text-slate-500" : "border-green-200 text-slate-400"
            }`}>
              <div className="text-4xl mb-2">✅</div>
              <p className="font-semibold text-green-600">No clinical alerts detected</p>
              <p className="text-xs mt-1">All auto-checks passed for this patient.</p>
            </div>
          ) : (
            observations.map((obs, i) => (
              <ObservationCard key={i} obs={obs} darkMode={darkMode} />
            ))
          )
        )}

        {/* Risk breakdown */}
        {activeSection === "risk" && (
          <RiskBreakdown riskResult={riskResult} darkMode={darkMode} />
        )}

        {/* Differentials */}
        {activeSection === "differentials" && (
          <div>
            <p className={`text-xs mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Auto-suggested for: <strong>{patient.disease || "unspecified complaint"}</strong>
            </p>
            {differentials.length === 0 ? (
              <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                No auto-suggestions for this complaint. Consult the physician's differential.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {differentials.map((d, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-center gap-2 text-sm ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                    }`}
                  >
                    <span className="text-cyan-500 font-bold text-xs">{i + 1}.</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}
            <p className={`mt-3 text-[10px] ${darkMode ? "text-slate-600" : "text-slate-400"}`}>
              ⚠️ Auto-suggestions only. Not a substitute for clinical judgment.
            </p>
          </div>
        )}

        {/* Health Score */}
        {activeSection === "health" && (
          <div className="space-y-4">
            {/* Score circle */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className={`p-6 rounded-2xl border text-center min-w-[140px] ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                <p className={`text-5xl font-extrabold ${healthCat.color}`}>{trendsSummary.healthScore}</p>
                <p className="text-xs text-slate-500 mt-1">/ 100</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${healthCat.bg} ${healthCat.color}`}>
                  {healthCat.label}
                </span>
              </div>
              <div className="flex-1 space-y-3">
                {/* Out of range vitals */}
                {trendsSummary.outOfRangeVitals.length > 0 && (
                  <div className={`p-3 rounded-xl border ${darkMode ? "bg-amber-950/20 border-amber-800" : "bg-amber-50 border-amber-200"}`}>
                    <p className="text-xs font-bold text-amber-500 mb-1">⚠️ Out-of-Range Vitals</p>
                    <div className="flex flex-wrap gap-1">
                      {trendsSummary.outOfRangeVitals.map((v, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{v}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Total Visits",      value: trendsSummary.totalVisits  },
                    { label: "Risk Level",         value: trendsSummary.riskLevel   },
                    { label: "Risk Score",         value: trendsSummary.riskScore   },
                    { label: "Last Visit Month",   value: trendsSummary.lastVisitDate || "N/A" },
                  ].map((item) => (
                    <div key={item.label} className={`p-3 rounded-xl border text-center ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                      <p className="text-base font-bold">{item.value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Summary */}
        {activeSection === "ai" && (
          <div>
            {!aiSummary && !aiLoading && !aiError && (
              <div className="text-center mb-4">
                <button
                  onClick={loadAI}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
                >
                  🤖 Generate AI Summary
                </button>
                <p className={`text-xs mt-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                  Uses Claude AI to analyze this patient's full record.
                </p>
              </div>
            )}
            <AICard summary={aiSummary} loading={aiLoading} error={aiError} darkMode={darkMode} />
          </div>
        )}
      </div>
    </div>
  );
}
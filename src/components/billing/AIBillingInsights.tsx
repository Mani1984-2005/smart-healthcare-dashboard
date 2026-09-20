import { ReactElement } from "react";
import { Sparkles, AlertTriangle, Info, TriangleAlert } from "lucide-react";
import { BillingInsight } from "../../stores/billingStore.ts";

type AIBillingInsightsProps = {
  insights: BillingInsight[];
};

const toneStyles: Record<BillingInsight["tone"], { badge: string; icon: ReactElement }> = {
  critical: { badge: "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/40", icon: <TriangleAlert className="h-4 w-4 text-rose-600 dark:text-rose-300" /> },
  warning: { badge: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/40", icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" /> },
  info: { badge: "border-sky-200 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/40", icon: <Info className="h-4 w-4 text-sky-600 dark:text-sky-300" /> },
};

export default function AIBillingInsights({ insights }: AIBillingInsightsProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Billing intelligence</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Automated checks across current invoices — overdue risk, insurance follow-up, and data-entry mismatches.
      </p>
      <div className="mt-4 space-y-3">
        {insights.map((insight) => (
          <div key={insight.id} className={`flex items-start gap-3 rounded-lg border p-4 ${toneStyles[insight.tone].badge}`}>
            <span className="mt-0.5">{toneStyles[insight.tone].icon}</span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{insight.title}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{insight.message}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Lightbulb } from "lucide-react";
import { ReportResult, reportToCsv } from "./reportData.ts";
import { Button, Section, Badge } from "../ui";

type ReportViewProps = {
  result: ReportResult;
};

function downloadCsv(result: ReportResult) {
  const csv = reportToCsv(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${result.definition.id}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportView({ result }: ReportViewProps) {
  const { chart } = result;

  return (
    <div className="space-y-6">
      <Section
        title={result.definition.title}
        description={`Generated ${result.generatedAt}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => downloadCsv(result)} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <span title="Excel and PDF export require adding an export library (xlsx / jspdf) to the project — not yet installed.">
              <Button variant="ghost" disabled className="gap-2">Excel / PDF</Button>
            </span>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {result.summary.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
            </div>
          ))}
        </div>
      </Section>

      {chart && chart.data.length > 0 && (
        <Section title="Trend" description="Visual breakdown of the report data">
          <div className="h-72" aria-label={`${result.definition.title} chart`}>
            <ResponsiveContainer width="100%" height="100%">
              {chart.type === "line" ? (
                <LineChart data={chart.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey={chart.xKey} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip />
                  {chart.dataKeys.map((key) => (
                    <Line key={key} type="monotone" dataKey={key} stroke="#0b6e99" strokeWidth={2.5} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              ) : chart.type === "area" ? (
                <AreaChart data={chart.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey={chart.xKey} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip />
                  {chart.dataKeys.map((key) => (
                    <Area key={key} type="monotone" dataKey={key} stroke="#0b6e99" fill="#0b6e99" fillOpacity={0.15} />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={chart.data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey={chart.xKey} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip />
                  {chart.dataKeys.map((key) => (
                    <Bar key={key} dataKey={key} fill="#0b6e99" radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {result.insights.length > 0 && (
        <Section title="Report insights" description="Auto-generated from this report's underlying data">
          <ul className="space-y-2">
            {result.insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Report data" description={`${result.table.rows.length} rows`} action={<Badge variant="neutral">{result.definition.category}</Badge>}>
        {result.table.rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No data available for this report yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  {result.table.columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {result.table.rows.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                    {result.table.columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-sm text-slate-700 dark:text-slate-200">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

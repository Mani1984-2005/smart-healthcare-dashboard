import { FormEvent, useState } from "react";
import { Sparkles, Search } from "lucide-react";
import { Button } from "../ui";
import { matchReportFromQuery } from "./reportData.ts";

type ReportAssistantProps = {
  onSelectReport: (reportId: string) => void;
};

const examplePrompts = [
  "Generate monthly hospital performance report",
  "Find unpaid emergency bills",
  "Show today's ICU occupancy",
  "Doctor performance this month",
];

export default function ReportAssistant({ onSelectReport }: ReportAssistantProps) {
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);

  const runQuery = (text: string) => {
    const match = matchReportFromQuery(text);
    if (match) {
      setNotFound(false);
      onSelectReport(match.id);
    } else {
      setNotFound(true);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runQuery(query);
  };

  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-900/40 dark:bg-cyan-950/20">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ask for a report</p>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Matches your request against the report catalog below by keyword — try a phrase like the examples.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setNotFound(false); }}
            placeholder="e.g. Show today's ICU occupancy"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <Button type="submit">Generate</Button>
      </form>
      {notFound && (
        <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
          No report matched that request. Try one of the examples below or pick a report from the catalog.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {examplePrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => { setQuery(prompt); runQuery(prompt); }}
            className="rounded-full border border-cyan-300 bg-white px-3 py-1 text-xs font-medium text-cyan-800 transition hover:bg-cyan-100 dark:border-cyan-800 dark:bg-slate-950 dark:text-cyan-200 dark:hover:bg-cyan-950/40"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

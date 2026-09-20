import { useState } from "react";
import { ReportCategory, reportCatalog } from "./reportData.ts";
import { Badge } from "../ui";
import TabList from "../common/TabList.tsx";

type ReportTypeSelectorProps = {
  selectedId: string;
  onSelect: (id: string) => void;
};

const categories: ReportCategory[] = ["Patient", "Doctor", "Financial", "Operations"];

export default function ReportTypeSelector({ selectedId, onSelect }: ReportTypeSelectorProps) {
  const selectedCategory = reportCatalog.find((r) => r.id === selectedId)?.category || "Financial";
  const [activeCategory, setActiveCategory] = useState<ReportCategory>(selectedCategory);

  return (
    <div>
      <TabList
        label="Report categories"
        options={categories.map((category) => ({ id: category, label: category }))}
        activeId={activeCategory}
        onChange={(id) => setActiveCategory(id as ReportCategory)}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="tabpanel" id={`tabpanel-${activeCategory}`} aria-labelledby={`tab-${activeCategory}`}>
        {reportCatalog.filter((report) => report.category === activeCategory).map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => onSelect(report.id)}
            className={`rounded-lg border p-4 text-left transition ${
              selectedId === report.id
                ? "border-cyan-600 bg-cyan-50 dark:border-cyan-500 dark:bg-cyan-950/30"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{report.title}</p>
              {selectedId === report.id && <Badge variant="info">Selected</Badge>}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{report.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

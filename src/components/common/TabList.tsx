type TabOption = {
  id: string;
  label: string;
  disabled?: boolean;
};

type TabListProps = {
  label: string;
  options: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
};

export default function TabList({ label, options, activeId, onChange }: TabListProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
      {options.map((option) => {
        const selected = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            id={`tab-${option.id}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${option.id}`}
            disabled={option.disabled}
            onClick={() => !option.disabled && onChange(option.id)}
            className={[
              "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
              selected
                ? "border-cyan-600 bg-cyan-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600",
              option.disabled ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

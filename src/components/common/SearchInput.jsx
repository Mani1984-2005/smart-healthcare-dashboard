export default function SearchInput({ value, onChange, placeholder = "Search records", className = "" }) {
  return (
    <label className={`flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-cyan-500 dark:border-slate-800 dark:bg-slate-950 ${className}`}>
      <span className="text-slate-400 dark:text-slate-500">🔍</span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-slate-900 outline-none dark:text-slate-100"
        aria-label="Search"
      />
    </label>
  );
}

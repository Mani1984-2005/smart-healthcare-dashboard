// FILE PATH: src/components/ui/SearchBar.jsx
// CREATE this new file.
//
// Reusable search input — wraps Input.jsx with a search icon and an
// optional clear ("x") button. Pure UI — search/filter logic stays in
// the parent page exactly as before (this just controls the `value`).
//
// USAGE:
//   <SearchBar value={search} onChange={setSearch} placeholder="Search patients, ID, phone..." />

import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full h-10 rounded-sm border border-neutral-200 bg-white
          pl-9 pr-9
          text-body text-neutral-800 placeholder:text-neutral-400
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
        "
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 inline-flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
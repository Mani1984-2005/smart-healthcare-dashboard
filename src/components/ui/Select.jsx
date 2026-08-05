// FILE PATH: src/components/ui/Select.jsx
// CREATE this new file.
//
// Reusable select/dropdown primitive matching the Input component's
// visual language (label, error, helper text). Pure UI — no business logic.
//
// USAGE:
//   <Select label="Category" name="category" value={form.category} onChange={handleChange}
//     options={["Antibiotic", "Analgesic", "Other"]} placeholder="Select category..." />
//
//   // Options can also be { value, label } objects:
//   <Select options={[{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }]} />

import { ChevronDown } from "lucide-react";

export default function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  selectClassName = "",
  ...rest
}) {
  // Normalize options to { value, label } shape, supporting plain strings too
  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-small font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            w-full h-10 rounded-sm border bg-white appearance-none
            pl-3 pr-9
            text-body text-neutral-800
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
            disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
            ${error ? "border-error-500 focus:ring-error-50 focus:border-error-500" : "border-neutral-200"}
            ${selectClassName}
          `}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        />
      </div>

      {error && <span className="text-tiny text-error-500">{error}</span>}
      {!error && helperText && <span className="text-tiny text-neutral-400">{helperText}</span>}
    </div>
  );
}
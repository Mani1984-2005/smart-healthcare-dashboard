// FILE PATH: src/components/ui/Textarea.jsx
// CREATE this new file.
//
// Reusable multi-line text input primitive matching Input/Select's
// visual language. Pure UI — no business logic.
//
// USAGE:
//   <Textarea label="Notes" name="notes" value={form.notes} onChange={handleChange} rows={3} />

export default function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  rows = 3,
  disabled = false,
  required = false,
  resizable = false,
  className = "",
  textareaClassName = "",
  ...rest
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-small font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-500 ml-0.5">*</span>}
        </label>
      )}

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`
          w-full rounded-sm border bg-white px-3 py-2.5
          text-body text-neutral-800 placeholder:text-neutral-400
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
          disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
          ${resizable ? "resize-y" : "resize-none"}
          ${error ? "border-error-500 focus:ring-error-50 focus:border-error-500" : "border-neutral-200"}
          ${textareaClassName}
        `}
        {...rest}
      />

      {error && <span className="text-tiny text-error-500">{error}</span>}
      {!error && helperText && <span className="text-tiny text-neutral-400">{helperText}</span>}
    </div>
  );
}
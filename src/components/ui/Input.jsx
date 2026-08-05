// FILE PATH: src/components/ui/Input.jsx
// CREATE this new file.
//
// Reusable text input primitive with label, error state, helper text,
// and optional leading/trailing icon. Pure UI — no business logic.
//
// USAGE:
//   <Input label="Patient Name" name="patientName" value={form.patientName} onChange={handleChange} />
//   <Input label="Email" type="email" error={errors.email} />
//   <Input label="Search" icon={<Search size={16} />} placeholder="Search patients..." />

export default function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  helperText,
  icon,
  iconPosition = "left",
  disabled = false,
  required = false,
  className = "",
  inputClassName = "",
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

      <div className="relative">
        {icon && iconPosition === "left" && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {icon}
          </span>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full h-10 rounded-sm border bg-white
            text-body text-neutral-800 placeholder:text-neutral-400
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
            disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
            ${icon && iconPosition === "left" ? "pl-9 pr-3" : icon && iconPosition === "right" ? "pl-3 pr-9" : "px-3"}
            ${error ? "border-error-500 focus:ring-error-50 focus:border-error-500" : "border-neutral-200"}
            ${inputClassName}
          `}
          {...rest}
        />

        {icon && iconPosition === "right" && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {icon}
          </span>
        )}
      </div>

      {error && <span className="text-tiny text-error-500">{error}</span>}
      {!error && helperText && <span className="text-tiny text-neutral-400">{helperText}</span>}
    </div>
  );
}
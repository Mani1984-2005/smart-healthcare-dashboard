// FILE PATH: src/components/ui/Button.jsx
// CREATE this new file.
//
// Reusable button primitive used across all pages going forward.
// Pure UI component — no business logic, no localStorage, no routing.
//
// USAGE:
//   <Button>Save</Button>
//   <Button variant="secondary">Cancel</Button>
//   <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
//   <Button loading={isSubmitting}>Submit</Button>
//   <Button icon={<Plus size={16} />}>Add Medicine</Button>

import { Loader2 } from "lucide-react";

const VARIANT_CLASSES = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-soft disabled:bg-primary-300",
  secondary:
    "bg-white text-primary-600 border border-primary-200 hover:bg-primary-50 active:bg-primary-100 disabled:text-primary-300 disabled:border-primary-100",
  ghost:
    "bg-transparent text-primary-600 hover:bg-primary-50 active:bg-primary-100 disabled:text-primary-300",
  danger:
    "bg-error-500 text-white hover:bg-error-700 active:bg-error-700 shadow-soft disabled:bg-error-50 disabled:text-error-500",
  outline:
    "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 active:bg-neutral-100 disabled:text-neutral-300",
};

const SIZE_CLASSES = {
  sm: "h-9 px-3 text-small gap-1.5",
  md: "h-10 px-4 text-body gap-2",
  lg: "h-11 px-5 text-body gap-2",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon = null,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  type = "button",
  className = "",
  onClick,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center
        rounded-md font-semibold
        transition-colors duration-150
        disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-1
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        icon && iconPosition === "left" && icon
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === "right" && icon}
    </button>
  );
}

/**
 * IconButton — square button for icon-only actions (table row actions,
 * topbar icons, etc). Keeps a consistent hit-target size.
 *
 * USAGE: <IconButton icon={<Edit2 size={16} />} onClick={...} label="Edit" />
 */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  className = "",
  onClick,
  disabled = false,
  ...rest
}) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-11 h-11",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        inline-flex items-center justify-center
        rounded-md
        transition-colors duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-primary-300
        ${VARIANT_CLASSES[variant]}
        ${sizeMap[size]}
        ${className}
      `}
      {...rest}
    >
      {icon}
    </button>
  );
}
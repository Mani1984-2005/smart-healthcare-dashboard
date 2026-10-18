// FILE PATH: src/components/ui/EmptyState.jsx
// CREATE this new file.
//
// Friendly empty-state component — the "20% friendly/student-innovative"
// part of the design system. Used whenever a list/table has zero items.
//
// USAGE:
//   <EmptyState
//     icon={<Pill size={28} />}
//     title="No medicines yet"
//     description="Let's add your first medicine to start tracking inventory."
//     action={<Button onClick={openAddForm}>+ Add Medicine</Button>}
//   />

export default function EmptyState({
  icon,
  title = "Nothing here yet",
  description,
  action,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-400 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-h3 text-neutral-700">{title}</h3>
      {description && (
        <p className="text-small text-neutral-400 mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
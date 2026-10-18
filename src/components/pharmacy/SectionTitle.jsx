export default function SectionTitle({ title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

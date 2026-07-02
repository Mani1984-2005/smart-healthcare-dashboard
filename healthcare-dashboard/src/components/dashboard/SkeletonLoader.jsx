export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-slate-200" />
        <div className="w-12 h-4 rounded-full bg-slate-200" />
      </div>
      <div className="h-7 w-20 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-16 bg-slate-200 rounded" />
    </div>
  );
}

export function SkeletonWidget() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 rounded bg-slate-200" />
        <div className="h-4 w-32 bg-slate-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-slate-200 rounded" />
        <div className="h-3 w-5/6 bg-slate-200 rounded" />
        <div className="h-3 w-4/6 bg-slate-200 rounded" />
        <div className="h-3 w-full bg-slate-200 rounded" />
        <div className="h-3 w-3/6 bg-slate-200 rounded" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 rounded bg-slate-200" />
        <div className="h-4 w-40 bg-slate-200 rounded" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4 mb-3">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="h-3 w-12 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
    </div>
  );
}

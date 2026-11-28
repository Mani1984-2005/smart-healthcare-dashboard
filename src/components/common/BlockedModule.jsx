export default function BlockedModule({
  title,
  description,
  missing,
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <section className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
        <span className="inline-flex rounded-full border border-amber-700/50 bg-amber-950/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
          Blocked by backend
        </span>
        <h1 className="mt-5 text-3xl font-black">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{description}</p>
        {missing && (
          <ul className="mt-6 grid gap-2 text-sm text-slate-300">
            {missing.map((item) => (
              <li key={item} className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

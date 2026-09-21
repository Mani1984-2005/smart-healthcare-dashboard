import { ReactNode } from "react";

/**
 * Same look as the shared PageHeader, but an <h2>: the app shell already renders the page's <h1>
 * (the route label), and a second <h1> would confuse screen-reader heading navigation.
 */
export default function PageIntro({ actions, description, eyebrow, title }: { actions?: ReactNode; description?: string; eyebrow?: string; title: string }) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

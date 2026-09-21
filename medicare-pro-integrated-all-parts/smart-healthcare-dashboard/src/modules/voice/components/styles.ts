/**
 * Tailwind class tokens shared by the voice components. They reuse the
 * MediCare Pro palette (cyan-700 primary, slate neutrals, rounded-xl panels)
 * without importing host components, so the module stays portable.
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-600/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950";

export const panel =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-6 dark:border-slate-800 dark:bg-slate-950";

export const bodyText = "text-base leading-8 text-slate-800 sm:text-lg dark:text-slate-100";
export const mutedText = "text-sm leading-7 text-slate-600 dark:text-slate-300";
export const sectionHeading = "text-lg font-semibold leading-8 text-slate-900 sm:text-xl dark:text-slate-100";

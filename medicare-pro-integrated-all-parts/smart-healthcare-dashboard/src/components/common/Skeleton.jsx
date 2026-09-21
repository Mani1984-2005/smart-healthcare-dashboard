export default function Skeleton({ className = "h-8 w-full rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" }) {
  return <div className={`${className} animate-pulse`} />;
}

// FILE PATH: src/components/ui/Skeleton.jsx
// Skeleton loading primitives — lightweight shimmer placeholders
// used across pages while data is loading.
//
// USAGE:
//   <Skeleton className="h-10 w-40" />
//   <Skeleton.Circle size={48} />
//   <Skeleton.Text lines={3} />

export default function Skeleton({ className = "", ...rest }) {
  return (
    <div
      className={`rounded-md bg-neutral-200/70 dark:bg-neutral-700/50 animate-pulse ${className}`}
      {...rest}
    />
  );
}

function Circle({ size = 40, className = "" }) {
  return (
    <div
      className={`rounded-full bg-neutral-200/70 dark:bg-neutral-700/50 animate-pulse shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function Text({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3.5 rounded bg-neutral-200/70 dark:bg-neutral-700/50 animate-pulse ${
            i === lines - 1 ? "w-3/4" : "w-full"
          }`}
        />
      ))}
    </div>
  );
}

function Card({ className = "" }) {
  return (
    <div className={`rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 p-5 ${className}`}>
      <div className="flex items-start gap-4">
        <Circle size={40} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Text lines={2} className="mt-4" />
    </div>
  );
}

Skeleton.Circle = Circle;
Skeleton.Text = Text;
Skeleton.Card = Card;
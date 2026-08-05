export default function ErrorState({ message = "An error occurred.", className = "" }) {
  return (
    <div className={`rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-100 ${className}`}>
      <h2 className="text-lg font-semibold">Error</h2>
      <p className="mt-2 text-sm">{message}</p>
    </div>
  );
}

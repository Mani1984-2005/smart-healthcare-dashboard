export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="mt-4 flex flex-wrap items-center gap-2" aria-label="Pagination">
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-2xl border px-3 py-2 text-sm transition ${
            page === currentPage
              ? "border-cyan-600 bg-cyan-600 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          }`}
        >
          {page}
        </button>
      ))}
    </nav>
  );
}

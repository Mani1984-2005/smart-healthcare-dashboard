export function Footer() {
  return (
    <footer className="mt-auto border-t border-border dark:border-border-dark">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-faint">
        <p>© {new Date().getFullYear()} Medicare Pro. Foundation build — Part 1.</p>
        <p className="font-mono">OCR engine: tesseract.js · PostgreSQL</p>
      </div>
    </footer>
  );
}

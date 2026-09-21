import { useEffect, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePart3Client } from "../services/clientContext";
import ErrorNotice from "./ErrorNotice";
import type { DocumentRecord } from "../types/part3";

/** Shows the stored original. Fetched with the session token (not a public URL) and shown as a blob. */
export default function DocumentViewer({ document }: { document: DocumentRecord }) {
  const client = usePart3Client();
  const file = useAsyncData(`file:${document.id}`, () => client.getDocumentFile(document.id));
  const url = useMemo(() => (file.data ? URL.createObjectURL(file.data) : null), [file.data]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  if (file.error) return <ErrorNotice error={file.error} title="The original could not be loaded" onRetry={file.reload} />;
  if (file.loading && !url) return <LoadingState label="Loading original…" />;
  if (!url) return <EmptyState title="Original not available" />;
  const isImage = document.mimeType.startsWith("image/");
  return (
    <figure>
      {isImage ? (
        <img src={url} alt={`Scanned ${document.docType.replace("_", " ")} document${document.synthetic ? " (synthetic demo)" : ""}`} className="max-h-[36rem] w-full rounded-xl border border-slate-200 bg-white object-contain dark:border-slate-800" />
      ) : (
        <EmptyState title="PDF document" description="PDFs open in a new tab." />
      )}
      <figcaption className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{document.originalFilename}</span>
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-cyan-700 hover:underline dark:text-cyan-300">Open full size <ExternalLink className="h-3 w-3" aria-hidden="true" /></a>
      </figcaption>
    </figure>
  );
}

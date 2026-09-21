import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePart3Client } from "../services/clientContext";
import { formatDateTime } from "../services/format";
import ErrorNotice from "./ErrorNotice";

/** Audit trail for one document (administrators only; the server enforces this). Contains no document text. */
export default function ActivityPanel({ documentId, refreshKey = 0 }: { documentId: string; refreshKey?: number }) {
  const client = usePart3Client();
  const audit = useAsyncData(`audit:${documentId}:${refreshKey}`, () => client.listAudit({ documentId, limit: 50 }));
  if (audit.error) return <ErrorNotice error={audit.error} title="Activity could not be loaded" onRetry={audit.reload} />;
  if (!audit.data) return <LoadingState label="Loading activity…" />;
  if (!audit.data.length) return <EmptyState title="No activity recorded" />;
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
      {audit.data.map((e) => (
        <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span><span className="font-medium text-slate-900 dark:text-slate-100">{e.action.replace(/_/g, " ").toLowerCase()}</span> · {e.actor?.role ?? "system"}{e.outcome !== "success" ? ` · ${e.outcome}` : ""}</span>
          <time dateTime={e.timestamp} className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(e.timestamp)}</time>
        </li>
      ))}
    </ul>
  );
}

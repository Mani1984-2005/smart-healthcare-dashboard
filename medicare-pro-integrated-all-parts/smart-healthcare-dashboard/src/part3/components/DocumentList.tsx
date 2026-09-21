import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import { useAsyncData } from "../hooks/useAsyncData";
import { usePart3Client } from "../services/clientContext";
import { docTypeLabel, formatBytes, formatDateTime } from "../services/format";
import { StatusBadge, SyntheticBadge } from "./badges";
import ErrorNotice from "./ErrorNotice";

export default function DocumentList({ patientId, refreshKey = 0, onAdd }: { patientId: string; refreshKey?: number; onAdd: () => void }) {
  const client = usePart3Client();
  const docs = useAsyncData(`docs:${patientId}:${refreshKey}`, () => client.listDocuments({ patientId, limit: 50 }));
  if (docs.error) return <ErrorNotice error={docs.error} title="Documents could not be loaded" onRetry={docs.reload} />;
  if (!docs.data) return <LoadingState label="Loading documents…" />;
  if (!docs.data.items.length) {
    return <EmptyState title="No documents for this patient yet" description="Choose a synthetic demo document or upload a scan to get started." action={<Button onClick={onAdd}>Add a document</Button>} />;
  }
  return (
    <div className="relative overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Documents for the selected patient</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr><th scope="col" className="px-4 py-3">Document</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Added</th></tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {docs.data.items.map((d) => (
            <tr key={d.id}>
              <th scope="row" className="px-4 py-3 font-medium">
                <Link to={`/medical-documents/${d.id}`} className="text-cyan-700 hover:underline dark:text-cyan-300">{docTypeLabel(d.docType)}</Link>
                <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">{d.originalFilename} · {formatBytes(d.sizeBytes)}</span>
              </th>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><StatusBadge status={d.status} />{d.synthetic && <SyntheticBadge />}</div></td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(d.uploadedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

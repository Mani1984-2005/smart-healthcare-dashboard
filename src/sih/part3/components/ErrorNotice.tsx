import { CircleAlert } from "lucide-react";
import Button from "../../components/ui/Button";
import { describeError, errorRequestId } from "../services/errors";

export default function ErrorNotice({ error, onRetry, title = "Something went wrong" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const requestId = errorRequestId(error);
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-6">{describeError(error)}</p>
        {requestId && <p className="mt-1 text-xs opacity-80">Reference: {requestId}</p>}
        {onRetry && <Button variant="secondary" className="mt-3" onClick={onRetry}>Try again</Button>}
      </div>
    </div>
  );
}

import { useCallback, useState } from "react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Dialog from "../../../components/ui/Dialog";
import Section from "../../../components/ui/Section";
import type { Analysis, ReviewDecision, ReviewState } from "../types";
import { formatDate, reviewLabel } from "../helpers";
import { Notice, OriginTag, type Provenance } from "./ui";

interface Item { id: string; title: string; origin: Provenance; review: ReviewState; statement?: string }
type Submit = (body: { itemId: string; decision: ReviewDecision; note?: string; modifiedText?: string }) => Promise<boolean>;

function buildItems(a: Analysis): Item[] {
  const items: Item[] = [{ id: "summary", title: "Clinical summary (record-derived)", origin: "record", review: a.summary.review }];
  if (a.summary.aiNarrative) items.push({ id: "ai-narrative", title: "AI-drafted narrative", origin: "ai", review: a.summary.aiNarrative.review, statement: a.summary.aiNarrative.text });
  for (const f of a.findings) if (f.reviewRequired) items.push({ id: f.id, title: f.title, origin: f.origin === "ai" ? "ai" : "rules", review: f.review, statement: f.statement });
  return items;
}

export function ReviewPanel({ analysis, canReview, busyId, error, onSubmit }: { analysis: Analysis; canReview: boolean; busyId: string | null; error: string | null; onSubmit: Submit }) {
  const items = buildItems(analysis);
  const done = analysis.reviewProgress.completed;
  const total = analysis.reviewProgress.total;
  const [dialog, setDialog] = useState<{ item: Item; mode: "rejected" | "modified" } | null>(null);
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  // Stable identity: Dialog re-runs its focus-trap effect whenever onClose changes, which would steal focus from the textarea on every keystroke.
  const close = useCallback(() => { setDialog(null); setNote(""); setText(""); setProblem(null); }, [setDialog, setNote, setText, setProblem]);
  async function confirm() {
    if (!dialog) return;
    if (dialog.mode === "rejected" && !note.trim()) return setProblem("Please explain why this item is being rejected.");
    if (dialog.mode === "modified" && !text.trim()) return setProblem("Please enter the corrected text.");
    const ok = await onSubmit({ itemId: dialog.item.id, decision: dialog.mode, ...(note.trim() ? { note: note.trim() } : {}), ...(dialog.mode === "modified" ? { modifiedText: text.trim() } : {}) });
    if (ok) close();
  }

  return (
    <div className="space-y-5">
      <Notice>AI and rule output is <strong>never marked approved automatically</strong>. Every item stays “Needs review” until a doctor records a decision. Your decision is stored with your identity and time; the original output is never edited.</Notice>
      {!canReview && <Notice tone="warning" role="status">Only a doctor can record a clinician review. You can see each item and its status.</Notice>}
      <Section title="Review progress" description={`${done} of ${total} items reviewed`}>
        <div role="progressbar" aria-label="Review progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-cyan-700 transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
        {analysis.reviewStatus === "reviewed" && <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">Every item has a clinician decision.</p>}
        {error && <div className="mt-3"><Notice tone="danger" role="alert">{error}</Notice></div>}
      </Section>

      <ul className="space-y-3">
        {items.map((item) => {
          const r = item.review;
          const busy = busyId === item.id;
          return (
            <li key={item.id} data-testid={`review-${item.id}`} className={`rounded-xl p-4 ${item.origin === "ai" ? "border border-dashed border-violet-400 bg-violet-50/60 dark:border-violet-500/60 dark:bg-violet-950/30" : "border border-slate-200 dark:border-slate-800"}`}>
              <div className="flex flex-wrap items-center gap-2"><OriginTag origin={item.origin} /><Badge variant={r.state === "reviewed" ? "success" : "warning"}>{r.state === "reviewed" ? reviewLabel(r) : "Needs review"}</Badge></div>
              <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
              {item.statement && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.statement}</p>}
              {r.state === "reviewed" && (
                <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                  <p><strong>{reviewLabel(r)}</strong> by {r.reviewer.name} ({r.reviewer.role.toLowerCase()}) · {formatDate(r.reviewedAt.slice(0, 16))}</p>
                  {r.note && <p className="mt-1">Note: {r.note}</p>}
                  {r.modifiedText && <p className="mt-1">Clinician’s version: {r.modifiedText}</p>}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" disabled={!canReview} loading={busy} aria-label={`Accept: ${item.title}`} onClick={() => onSubmit({ itemId: item.id, decision: "accepted" })}>Accept</Button>
                <Button variant="secondary" disabled={!canReview || busy} aria-label={`Reject: ${item.title}`} onClick={() => setDialog({ item, mode: "rejected" })}>Reject</Button>
                <Button variant="secondary" disabled={!canReview || busy} aria-label={`Modify: ${item.title}`} onClick={() => setDialog({ item, mode: "modified" })}>Modify</Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={dialog !== null} onClose={close} title={dialog?.mode === "rejected" ? "Reject this item" : "Modify this item"}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={close}>Cancel</Button><Button onClick={confirm} loading={busyId !== null && busyId === dialog?.item.id}>{dialog?.mode === "rejected" ? "Record rejection" : "Record modification"}</Button></div>}>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{dialog?.item.title}</p>
        {dialog?.mode === "modified" && <><label htmlFor="ci-modified" className="mt-4 block text-sm font-medium">Corrected text</label><textarea id="ci-modified" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900" /></>}
        <label htmlFor="ci-note" className="mt-4 block text-sm font-medium">{dialog?.mode === "rejected" ? "Reason (required)" : "Note (optional)"}</label>
        <textarea id="ci-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
        {problem && <p role="alert" className="mt-2 text-sm font-medium text-rose-700 dark:text-rose-300">{problem}</p>}
        {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>}
      </Dialog>
    </div>
  );
}

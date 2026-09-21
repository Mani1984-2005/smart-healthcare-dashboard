import { useState } from "react";
import Button from "../ui/Button.tsx";
import Card from "../ui/Card.tsx";

type Fact = { value: unknown; certainty: string };

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function FactRow({ label, fact, onEdit }: { label: string; fact: Fact; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-base text-slate-900 dark:text-slate-100">
          {displayValue(fact.value)}
          {fact.certainty && fact.certainty !== "CONFIRMED" && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {fact.certainty.toLowerCase()}
            </span>
          )}
        </p>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-sm font-medium text-cyan-700 hover:underline dark:text-cyan-400">
        Edit
      </button>
    </div>
  );
}

type ReviewScreenProps = {
  history: Record<string, any>;
  onEdit: (questionId: string) => void;
  onConfirm: () => void;
  loading: boolean;
};

export default function ReviewScreen({ history, onEdit, onConfirm, loading }: ReviewScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const hpi = history.historyOfPresentIllness ?? {};

  return (
    <div className="space-y-4">
      <Card title="Main concern">
        {history.chiefComplaint && (
          <FactRow label="Chief complaint" fact={history.chiefComplaint} onEdit={() => onEdit("chiefComplaint.text")} />
        )}
      </Card>

      {Object.keys(hpi).length > 0 && (
        <Card title="Current symptoms">
          {Object.entries(hpi).map(([key, fact]) => (
            <FactRow key={key} label={key} fact={fact as Fact} onEdit={() => onEdit(guessQuestionIdForHpiKey(key, history))} />
          ))}
        </Card>
      )}

      {history.allergies && (
        <Card title="Allergies">
          <p className="text-base text-slate-900 dark:text-slate-100">Status: {history.allergies.status}</p>
          {history.allergies.items?.map((item: any, i: number) => (
            <FactRow key={i} label="Allergy" fact={item} onEdit={() => onEdit("allergies.details")} />
          ))}
        </Card>
      )}

      {Array.isArray(history.pastMedicalHistory) && history.pastMedicalHistory.length > 0 && (
        <Card title="Past medical history">
          {history.pastMedicalHistory.map((fact: Fact, i: number) => (
            <FactRow key={i} label="Condition" fact={fact} onEdit={() => onEdit("pmh.conditions")} />
          ))}
        </Card>
      )}

      {Array.isArray(history.medications) && history.medications.length > 0 && (
        <Card title="Medications">
          {history.medications.map((fact: Fact, i: number) => (
            <FactRow key={i} label="Medication" fact={fact} onEdit={() => onEdit("medications.current")} />
          ))}
        </Card>
      )}

      {history.ayushHistory?.fields?.length > 0 && (
        <Card title="Additional health background">
          {history.ayushHistory.fields.map((f: any) => (
            <FactRow key={f.key} label={f.label} fact={f} onEdit={() => onEdit(`ayush.${f.key}`)} />
          ))}
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="min-h-14 flex-1 text-base"
          disabled={loading || confirming}
          onClick={() => {
            setConfirming(true);
            onConfirm();
          }}
        >
          Everything looks correct — finish
        </Button>
      </div>
    </div>
  );
}

// The history JSON stores HPI facts by a friendly sub-key (e.g. "onset"),
// while editing requires the original questionId (e.g. "hpi.chestpain.onset").
// Since the review screen doesn't know the active symptom category directly,
// this reconstructs it from context already present in the loaded history.
function guessQuestionIdForHpiKey(key: string, history: Record<string, any>): string {
  const chiefComplaintText = String(history?.chiefComplaint?.value ?? "").toLowerCase();
  const category = chiefComplaintText.includes("chest")
    ? "chestpain"
    : chiefComplaintText.includes("head")
      ? "headache"
      : "generic";
  return `hpi.${category}.${key}`;
}

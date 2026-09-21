import type { PatientRow } from "../api/types";
import { selectClass } from "../lib";

const RELATION: Record<PatientRow["relation"], string> = { self: "you", custodian: "your organisation holds the record", directory: "directory: not your record", masked: "masked" };

export default function PatientSelect({ rows, value, onChange }: { rows: PatientRow[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      Demo patient
      <select className={`${selectClass} mt-2 max-w-md`} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {rows.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName} · {p.id} ({RELATION[p.relation]})
          </option>
        ))}
      </select>
    </label>
  );
}

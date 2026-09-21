import { useState } from "react";
import { CalendarClock, Info } from "lucide-react";
import { Section, Button } from "../ui";

type Frequency = "Daily" | "Weekly" | "Monthly";

type ScheduledReportsProps = {
  reportTitle: string;
};

export default function ScheduledReports({ reportTitle }: ScheduledReportsProps) {
  const [frequency, setFrequency] = useState<Frequency>("Weekly");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const handleSave = () => {
    setSaved(`${frequency} delivery of "${reportTitle}" saved for ${email || "no recipient set"}.`);
  };

  return (
    <Section title="Scheduled reporting" description="Set a cadence for this report." action={<CalendarClock className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />}>
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        This preference is saved locally in your session only. Actual email/SMS delivery needs a backend mail service connected — not yet wired up.
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Frequency
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as Frequency)}
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Recipient email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@hospital.example"
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <Button onClick={handleSave}>Save schedule</Button>
      </div>
      {saved && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{saved}</p>}
    </Section>
  );
}

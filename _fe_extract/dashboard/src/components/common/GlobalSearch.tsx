import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchField } from "../ui";
import { usePatientStore } from "../../stores/patientStore.ts";
import { useDoctorsStore } from "../../stores/doctorsStore.ts";
import { useAppointmentsStore } from "../../stores/appointmentsStore.ts";
import { useBillingStore } from "../../stores/billingStore.ts";
import { useLabStore } from "../../stores/labStore.ts";
import { useContactsStore } from "../../stores/contactsStore.ts";

type SearchResult = { id: string; label: string; sublabel: string; path: string };

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const { patients } = usePatientStore();
  const { doctors } = useDoctorsStore();
  const { appointments } = useAppointmentsStore();
  const { invoices } = useBillingStore();
  const { tests } = useLabStore();
  const { contacts } = useContactsStore();

  const results = useMemo<SearchResult[]>(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const matches: SearchResult[] = [];

    patients.filter((p) => p.fullName.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)).forEach((p) => matches.push({ id: `pat-${p.id}`, label: p.fullName, sublabel: `Patient · ${p.id}`, path: `/patients/${p.id}` }));
    doctors.filter((d) => d.name.toLowerCase().includes(term) || d.department.toLowerCase().includes(term)).forEach((d) => matches.push({ id: `doc-${d.id}`, label: d.name, sublabel: `Doctor · ${d.department}`, path: "/doctors" }));
    appointments.filter((a) => a.patientName.toLowerCase().includes(term) || a.doctorName.toLowerCase().includes(term)).forEach((a) => matches.push({ id: `apt-${a.id}`, label: `${a.patientName} with ${a.doctorName}`, sublabel: `Appointment · ${a.date} ${a.time}`, path: "/appointments" }));
    invoices.filter((i) => i.invoiceNumber.toLowerCase().includes(term) || i.patientName.toLowerCase().includes(term)).forEach((i) => matches.push({ id: `inv-${i.id}`, label: i.invoiceNumber, sublabel: `Invoice · ${i.patientName} · ${i.status}`, path: "/billing" }));
    tests.filter((t) => t.testName.toLowerCase().includes(term) || t.patientName.toLowerCase().includes(term)).forEach((t) => matches.push({ id: `lab-${t.id}`, label: t.testName, sublabel: `Lab test · ${t.patientName} · ${t.status}`, path: "/laboratory" }));
    contacts.filter((c) => c.name.toLowerCase().includes(term)).forEach((c) => matches.push({ id: `con-${c.id}`, label: c.name, sublabel: `Contact · ${c.subType}`, path: "/contacts" }));

    return matches.slice(0, 8);
  }, [query, patients, doctors, appointments, invoices, tests, contacts]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery("");
    setFocused(false);
  };

  return (
    <div className="relative max-w-2xl flex-1">
      <SearchField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search patients, doctors, invoices, lab tests..."
      />
      {focused && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-950">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                onMouseDown={() => handleSelect(result)}
                className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{result.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{result.sublabel}</p>
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No matches for "{query}".</p>
          )}
        </div>
      )}
    </div>
  );
}

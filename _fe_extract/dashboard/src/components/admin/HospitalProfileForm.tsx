import { useState } from "react";
import Input from "../common/Input.jsx";
import { Button, Section } from "../ui";
import { HospitalProfile } from "../../stores/adminStore.ts";

type HospitalProfileFormProps = {
  profile: HospitalProfile;
  onSave: (profile: HospitalProfile) => void;
};

export default function HospitalProfileForm({ profile, onSave }: HospitalProfileFormProps) {
  const [form, setForm] = useState<HospitalProfile>(profile);
  const [saved, setSaved] = useState(false);

  const handleChange = <K extends keyof HospitalProfile>(key: K, value: HospitalProfile[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    onSave(form);
    setSaved(true);
  };

  return (
    <Section title="Hospital profile" description="Used across invoices, reports, and the patient medical record PDF.">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Hospital name" id="admin-hospital-name" value={form.name} onChange={(event) => handleChange("name", event.target.value)} />
        <Input label="Registration number" id="admin-registration-no" value={form.registrationNo} onChange={(event) => handleChange("registrationNo", event.target.value)} />
        <Input label="Emergency phone" id="admin-emergency-phone" value={form.emergencyPhone} onChange={(event) => handleChange("emergencyPhone", event.target.value)} />
        <Input label="Tagline" id="admin-tagline" value={form.tagline} onChange={(event) => handleChange("tagline", event.target.value)} />
        <div className="md:col-span-2">
          <Input label="Address" id="admin-address" value={form.address} onChange={(event) => handleChange("address", event.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave}>Save profile</Button>
        {saved && <span className="text-sm text-emerald-700 dark:text-emerald-300">Saved.</span>}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Saved locally in this session. To persist across sessions and devices, this needs to write to a real backend once one is connected.
      </p>
    </Section>
  );
}

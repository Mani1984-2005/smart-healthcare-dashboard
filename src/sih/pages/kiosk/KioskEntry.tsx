import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button.tsx";
import Card from "../../components/ui/Card.tsx";
import Input from "../../components/ui/Input.tsx";
import PageHeader from "../../components/ui/PageHeader.tsx";
import { useAuthStore } from "../../store/authStore.js";
import { useIntakeStore } from "../../stores/intakeStore.ts";

/**
 * Staff-facing screen: reception/nursing staff, already logged into
 * MediCare Pro (via the existing, unmodified demo login), start a new
 * clinical intake session for a specific patient here. This is the ONLY
 * place a session is created — the resulting token is then handed to the
 * kiosk device, which uses ONLY that token from here on
 * (see /kiosk/:sessionId, IntakeFlow.tsx).
 *
 * NOTE ON STAFF IDENTITY: `useAuthStore` is the existing, unmodified local
 * demo login — it is not cryptographic authentication. The backend's
 * Team1StaffAuthorizationAdapter treats whatever identity is sent here as
 * an unverified demo staff label. See that adapter's file header for the
 * full, documented limitation and the intended production replacement.
 */
export default function KioskEntry() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { startSession, loading, error } = useIntakeStore();
  const [patientId, setPatientId] = useState("");
  const [intakeMode, setIntakeMode] = useState<"STANDARD" | "AYUSH">("STANDARD");

  async function handleStart() {
    if (!patientId.trim()) return;
    await startSession({ patientId: patientId.trim(), staffId: user?.id ?? "unknown-staff", intakeMode });
    const { session, sessionToken } = useIntakeStore.getState();
    if (session && sessionToken) {
      navigate(`/kiosk/${session.id}`, { state: { sessionToken } });
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <PageHeader title="Start Clinical Intake" description="Begin an AI-assisted intake session for a patient." />
      <Card className="mt-6">
        <div className="space-y-5">
          <Input
            id="patientId"
            label="Patient ID"
            placeholder="Enter the patient's ID"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            hint="Use the ID shown on the patient's record in MediCare Pro."
          />

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Intake type</p>
            <div className="flex gap-3">
              <button
                type="button"
                aria-pressed={intakeMode === "STANDARD"}
                onClick={() => setIntakeMode("STANDARD")}
                className={`min-h-10 flex-1 rounded-lg border px-3 text-sm font-medium ${
                  intakeMode === "STANDARD" ? "border-cyan-700 bg-cyan-50 text-cyan-800 dark:border-cyan-500 dark:bg-cyan-950 dark:text-cyan-200" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                aria-pressed={intakeMode === "AYUSH"}
                onClick={() => setIntakeMode("AYUSH")}
                className={`min-h-10 flex-1 rounded-lg border px-3 text-sm font-medium ${
                  intakeMode === "AYUSH" ? "border-cyan-700 bg-cyan-50 text-cyan-800 dark:border-cyan-500 dark:bg-cyan-950 dark:text-cyan-200" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                AYUSH
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}

          <Button className="w-full" disabled={loading || !patientId.trim()} loading={loading} onClick={handleStart}>
            Start intake &amp; hand to kiosk
          </Button>
        </div>
      </Card>
    </div>
  );
}

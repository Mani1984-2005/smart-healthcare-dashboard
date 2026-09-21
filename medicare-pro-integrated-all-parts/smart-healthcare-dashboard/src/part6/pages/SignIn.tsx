import { useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { Badge, Button, Card, EmptyState, LoadingState } from "../../components/ui";
import { DemoBanner, ErrorPanel } from "../components/common";
import { api, ApiError, signIn } from "../api/client";
import type { DemoUser } from "../api/types";
import { useApi } from "../hooks/useApi";
import { ROLE_LABEL } from "../lib";

export default function SignIn() {
  const users = useApi(() => api.get<{ label: string; users: DemoUser[] }>("/auth/demo-users"), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  async function go(id: string) {
    setBusy(id);
    setError(null);
    try {
      await signIn(id);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, "ERROR", "Sign-in failed."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">MediCare Pro · SIH26047</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Part 6 · ABDM / FHIR / Consent / Security</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">A standalone interoperability prototype: FHIR resource generation and validation, patient-controlled consent, role-based access and a tamper-evident audit trail.</p>
        </div>
        <DemoBanner />
        <Card title="Choose a demo persona" subtitle="Prototype sign-in for demonstration: there are no passwords. A real deployment would authenticate through the hospital identity provider / ABDM sign-in.">
          {users.loading && <LoadingState label="Loading demo personas…" />}
          {users.error && <ErrorPanel error={users.error} onRetry={users.reload} />}
          {users.data && users.data.users.length === 0 && <EmptyState title="No personas" description="The service returned no demo users." />}
          {error && <div className="mb-4"><ErrorPanel error={error} /></div>}
          <div className="grid gap-3 sm:grid-cols-2">
            {users.data?.users.map((u) => (
              <div key={u.id} className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200">
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{u.displayName}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="info">{ROLE_LABEL[u.role]}</Badge>
                      {u.orgName && <Badge variant="neutral">{u.orgName}</Badge>}
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{u.blurb}</p>
                  </div>
                </div>
                <Button className="mt-4" loading={busy === u.id} onClick={() => void go(u.id)}>
                  <KeyRound className="h-4 w-4" aria-hidden="true" /> Sign in as {u.displayName}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

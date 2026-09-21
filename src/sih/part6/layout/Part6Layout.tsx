import { NavLink, Outlet } from "react-router-dom";
import { Activity, ArrowLeft, ClipboardList, FileJson, Fingerprint, Layers, Lock, PlayCircle, Settings, ShieldCheck, Share2, ScrollText, FileCheck2 } from "lucide-react";
import { useState } from "react";
import { Badge, Button } from "../../components/ui";
import { DemoBanner } from "../components/common";
import { api, signIn, signOut } from "../api/client";
import type { DemoUser, PermissionMatrix } from "../api/types";
import { useApi } from "../hooks/useApi";
import { usePart6Auth } from "../store/authStore";
import { ROLE_LABEL, selectClass } from "../lib";

const NAV = [
  { to: "/part6", label: "Overview", icon: Activity, permission: "overview.view", end: true },
  { to: "/part6/identity", label: "Patient Identity", icon: Fingerprint, permission: "identity.view" },
  { to: "/part6/resources", label: "FHIR Resources", icon: FileJson, permission: "fhir.read" },
  { to: "/part6/bundles", label: "FHIR Bundles", icon: Layers, permission: "fhir.read" },
  { to: "/part6/validation", label: "Validation", icon: FileCheck2, permission: "fhir.validate" },
  { to: "/part6/consent", label: "Consent", icon: ClipboardList, permission: "consent.view" },
  { to: "/part6/sharing", label: "Data Sharing", icon: Share2, permission: "share.view" },
  { to: "/part6/security", label: "Security", icon: ShieldCheck, permission: null },
  { to: "/part6/audit", label: "Audit Logs", icon: ScrollText, permission: "audit.view" },
  { to: "/part6/settings", label: "Settings", icon: Settings, permission: null },
  { to: "/part6/demo", label: "Guided Demo", icon: PlayCircle, permission: null },
] as const;

export default function Part6Layout() {
  const user = usePart6Auth((s) => s.user)!;
  const [switching, setSwitching] = useState(false);
  const matrix = useApi(() => api.get<PermissionMatrix>("/security/matrix"), [user.id]);
  const personas = useApi(() => api.get<{ users: DemoUser[] }>("/auth/demo-users"), []);

  const allowed = (permission: string | null) => {
    if (!permission) return true;
    const row = matrix.data?.rows.find((r) => r.permission === permission);
    return row ? Boolean(row.access[user.role]) : true;
  };

  async function switchTo(id: string) {
    if (id === user.id) return;
    setSwitching(true);
    try {
      await signOut();
      await signIn(id);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <a href="/" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> MediCare Pro
          </a>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight">Part 6 · ABDM / FHIR / Consent / Security</p>
            <p className="text-xs text-slate-500">Interoperability prototype · standalone module</p>
          </div>
          <Badge variant="warning">DEMO</Badge>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="persona">
              Acting as
            </label>
            <select id="persona" className={`${selectClass} min-h-9 w-52 py-1`} value={user.id} disabled={switching || !personas.data} onChange={(e) => void switchTo(e.target.value)}>
              {(personas.data?.users ?? [{ ...user, blurb: "" }]).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} · {ROLE_LABEL[p.role]}
                </option>
              ))}
            </select>
            <Button variant="secondary" className="min-h-9 px-3 py-1 text-xs" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Part 6 navigation" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-[3.75rem] lg:block lg:h-[calc(100vh-3.75rem)] lg:space-y-1 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-3">
          {NAV.map(({ to, label, icon: Icon, permission, ...rest }) => {
            const ok = allowed(permission);
            return (
              <NavLink key={to} to={to} end={"end" in rest} title={ok ? undefined : `Not available for the ${ROLE_LABEL[user.role]} role`} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"} ${ok ? "" : "opacity-60"}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="flex-1 whitespace-nowrap">{label}</span>
                {!ok && <Lock className="h-3 w-3" aria-label="restricted for your role" />}
              </NavLink>
            );
          })}
          <div className="mt-4 hidden rounded-lg border border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 lg:block">
            Signed in as
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{user.displayName}</p>
            <p>{ROLE_LABEL[user.role]}</p>
            {user.orgName && <p>{user.orgName}</p>}
          </div>
        </nav>

        <main className="min-w-0 space-y-6 p-4 lg:p-8">
          <DemoBanner compact />
          <Outlet key={user.id} />
        </main>
      </div>
    </div>
  );
}

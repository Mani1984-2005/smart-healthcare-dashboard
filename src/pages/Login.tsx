import { useState } from "react";
import { Activity, ArrowRight, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import { ROLES } from "../app/roles.js";

const defaultRoles = [
  ROLES.PATIENT,
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.RECEPTIONIST,
  ROLES.LAB_TECHNICIAN,
  ROLES.PHARMACIST,
  ROLES.ADMIN,
];

export default function LoginPage() {
  const [role, setRole] = useState(ROLES.PATIENT);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    login({
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      role,
      hospitalId: "hospital-01",
      token: `test-token-${role}`,
    });
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),transparent_26%),linear-gradient(135deg,#eff6ff_0%,#f8fafc_38%,#ecfeff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur xl:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-cyan-900 via-blue-900 to-slate-950 p-10 xl:flex xl:flex-col xl:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.25),transparent_25%)]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              <Activity className="h-3.5 w-3.5" />
              MediCare Pro
            </div>
            <h1 className="mt-8 max-w-md text-4xl font-semibold tracking-tight text-white">
              One intelligent workspace for modern hospital operations.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-cyan-50/85">
              Coordinate patient care, appointments, diagnostics, pharmacy, billing, and operational intelligence from a single system.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: HeartPulse, label: "Patient flow" },
              { icon: Stethoscope, label: "Clinical care" },
              { icon: ShieldCheck, label: "Secure access" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-white">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 shadow-sm dark:bg-cyan-950/50 dark:text-cyan-200">
                <HeartPulse className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Secure access</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">Welcome back</p>
              </div>
            </div>

            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Sign in to MediCare Pro</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Access the hospital operations workspace.</p>

            {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Jane Carter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="jane@metrocare.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Role</label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {defaultRoles.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:translate-y-[-1px] hover:shadow-cyan-600/30"
              >
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

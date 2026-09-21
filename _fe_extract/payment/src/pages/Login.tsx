import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuthStore } from "../store/authStore.js";
import { ROLES } from "../app/roles.js";
import { auth, isFirebaseConfigured } from "../services/firebase.js";

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
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  // FIX (continuation of the compatibility audit): this page used to be the
  // ONLY login path — a role picker with no real credential, which meant
  // "authentication" was whatever the client claimed. isFirebaseConfigured
  // (see services/firebase.js) is CONFIGURATION REQUIRED / NOT VERIFIED in
  // this environment (no VITE_FIREBASE_* values, no network path to
  // Firebase — see PAYMENT_MODULE_HANDOFF.md), so the dev-mode picker below
  // remains fully functional and unchanged for local development without
  // real credentials. Once real Firebase config exists, this component
  // switches to the real form automatically — no code change needed.
  return isFirebaseConfigured ? <FirebaseLoginForm from={from} navigate={navigate} /> : <DevModeLoginForm from={from} navigate={navigate} />;
}

function FirebaseLoginForm({ from, navigate }: { from: string; navigate: (path: string, opts?: { replace?: boolean }) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginWithFirebase } = useAuthStore();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!auth) throw new Error("Firebase auth is not initialized."); // guards the type; isFirebaseConfigured being true guarantees this in practice
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await loginWithFirebase(credential.user);
      navigate(from, { replace: true });
    } catch (err) {
      // Firebase auth errors (wrong-password, user-not-found, etc.) and the
      // "no linked MediCare Pro account" error from loginWithFirebase both
      // land here — deliberately shown as one generic message so a failed
      // sign-in attempt doesn't reveal whether a given email is registered.
      const message = err instanceof Error ? err.message : "";
      setError(message.includes("Contact an administrator") ? message : "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <h1 className="text-3xl font-semibold text-slate-900">Sign in to MediCare Pro</h1>
        <p className="mt-2 text-sm text-slate-600">Enterprise-ready healthcare access.</p>

        {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DevModeLoginForm({ from, navigate }: { from: string; navigate: (path: string, opts?: { replace?: boolean }) => void }) {
  const [role, setRole] = useState(ROLES.PATIENT);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const { loginDevMode } = useAuthStore();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    loginDevMode({ id: crypto.randomUUID(), name: name.trim(), email: email.trim(), role, hospitalId: "hospital-01" });
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          Dev mode — Firebase isn't configured, so authentication isn't real. This session cannot
          call any protected backend route. See .env.example.
        </div>

        <h1 className="text-3xl font-semibold text-slate-900">Sign in to MediCare Pro</h1>
        <p className="mt-2 text-sm text-slate-600">Enterprise-ready healthcare access.</p>

        {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            >
              {defaultRoles.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

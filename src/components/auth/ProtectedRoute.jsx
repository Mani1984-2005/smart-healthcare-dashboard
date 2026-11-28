import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function AccessDenied() {
  const { identity } = useAuth();
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
      <section className="max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Identity or authorization unavailable</h1>
        <p className="mt-3 text-sm text-slate-300">
          {identity?.error || "The backend did not return an authorized identity for this session."}
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Backend authorization must be enabled and verified before protected healthcare data is available.
        </p>
      </section>
    </main>
  );
}

export default function ProtectedRoute({ children, permission, role }) {
  const { user, identity, loading, hasPermission, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Verifying identity...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (identity.status !== "resolved") return <Navigate to="/access-denied" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/access-denied" replace />;
  if (role && !hasRole(role)) return <Navigate to="/access-denied" replace />;
  return children;
}

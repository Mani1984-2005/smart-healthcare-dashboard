import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.tsx";
import ProtectedRoute from "./components/security/ProtectedRoute.tsx";
import PermissionGuard from "./components/security/PermissionGuard.tsx";
import LoginPage from "./pages/Login.tsx";
import PatientDetails from "./pages/PatientDetails.tsx";
import { ROUTES } from "./app/routes.tsx";
import { useUiStore } from "./store/uiStore.js";

// Part 6 (ABDM/FHIR/Consent/Security prototype): standalone, own auth boundary, loaded on demand.
const Part6App = lazy(() => import("./part6/Part6App.tsx"));
// Part 1 (AI Clinical Intake): staff-facing entry is protected like any staff
// page; the kiosk device screen is deliberately NOT wrapped in
// ProtectedRoute/MainLayout — it authenticates only via the opaque
// per-session token, never MediCare Pro staff login.
const KioskEntry = lazy(() => import("./pages/kiosk/KioskEntry.tsx"));
const IntakeFlow = lazy(() => import("./pages/kiosk/IntakeFlow.tsx"));
// Part 2's own standalone demo/reviewer page for the voice module in
// isolation (no login, no other part). The module's own integration is the
// kiosk flow above; this route is additive, kept for parity with Part 2's
// existing regression test and for reviewers who want to see the module on
// its own.
const VoiceInteractionPage = lazy(() => import("./modules/voice/pages/VoiceInteractionPage.tsx"));

export default function App() {
  const isDarkMode = useUiStore((state) => state.isDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading application...</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/part6/*" element={<Part6App />} />
        <Route
          path="/kiosk"
          element={
            <ProtectedRoute>
              <KioskEntry />
            </ProtectedRoute>
          }
        />
        <Route path="/kiosk/:sessionId" element={<IntakeFlow />} />
        <Route path="/sih/voice" element={<VoiceInteractionPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          {ROUTES.map((route) => {
            const Page = route.element;
            return (
              <Route
                key={route.path}
                path={route.path.replace(/^\//, "")}
                element={
                  <PermissionGuard roles={route.roles}>
                    <Page />
                  </PermissionGuard>
                }
              />
            );
          })}
          <Route
            path="patients/:id"
            element={
              <PermissionGuard roles={["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"]}>
                <PatientDetails />
              </PermissionGuard>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

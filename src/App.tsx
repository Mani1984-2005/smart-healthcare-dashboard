import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.tsx";
import ProtectedRoute from "./components/security/ProtectedRoute.tsx";
import PermissionGuard from "./components/security/PermissionGuard.tsx";
import LoginPage from "./pages/Login.tsx";
import PatientDetails from "./pages/PatientDetails.tsx";
import { ROUTES } from "./app/routes.tsx";
import { useUiStore } from "./store/uiStore.js";

const Part6App = lazy(() => import("./sih/part6/Part6App.tsx"));
const KioskEntry = lazy(() => import("./sih/pages/kiosk/KioskEntry.tsx"));
const IntakeFlow = lazy(() => import("./sih/pages/kiosk/IntakeFlow.tsx"));
const VoiceInteractionPage = lazy(() => import("./sih/modules/voice/pages/VoiceInteractionPage.tsx"));

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
        <Route path="/kiosk" element={<ProtectedRoute><KioskEntry /></ProtectedRoute>} />
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

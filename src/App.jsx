import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./hooks/usetoast.jsx";
import { useTheme } from "./hooks/useTheme";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AccessDenied } from "./components/auth/ProtectedRoute";

const PatientsPage = lazy(() => import("./pages/PatientsPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const PatientDashboardPage = lazy(() => import("./pages/PatientDashboardPage"));
const DoctorWorkspacePage = lazy(() => import("./pages/DoctorWorkspacePage"));
const ReceptionistPage = lazy(() => import("./pages/ReceptionistPage"));
const LaboratoryPage = lazy(() => import("./pages/LaboratoryPage"));
const DoctorsPage = lazy(() => import("./pages/DoctorsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const MedicinesPage = lazy(() => import("./pages/MedicinesPage"));
const ComplaintsPage = lazy(() => import("./pages/ComplaintsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const PharmacyPage = lazy(() => import("./pages/PharmacyPage"));
const PharmacyInventoryPage = lazy(() => import("./pages/PharmacyInventoryPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const XRaySharingPage = lazy(() => import("./pages/XRaySharingPage"));
const PatientRelationsPage = lazy(() => import("./pages/PatientRelationsPage"));
const PrescriptionOcrPage = lazy(() => import("./pages/PrescriptionOcrPage"));

const queryClient = new QueryClient();

function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      Loading MediCare Pro...
    </div>
  );
}

function AuthenticatedRoutes() {
  const { user, loading } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const { addToast } = useToast();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) setDarkMode(savedTheme !== "light");
  }, [setDarkMode]);

  if (loading) return <AppLoading />;
  if (!user) return <Navigate to="/login" replace />;

  const pageProps = {
    darkMode,
    userRole: user.role || "Admin",
    addToast,
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<AppLoading />}>
          <Routes>
          <Route path="/" element={<HomePage {...pageProps} />} />
          <Route path="/dashboard" element={<DashboardPage {...pageProps} />} />
          <Route
            path="/patients"
            element={
              <ProtectedRoute permission="patient:read">
                <PatientsPage darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route path="/doctors" element={<DoctorsPage {...pageProps} />} />
          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute permission="pharmacy:dispense">
                <PharmacyPage darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route path="/medicines" element={<PharmacyPage darkMode={darkMode} initialTab="medicines" />} />
          <Route path="/inventory" element={<PharmacyPage darkMode={darkMode} initialTab="inventory" />} />
          <Route path="/pharmacy-inventory" element={<PharmacyPage darkMode={darkMode} initialTab="inventory" />} />
          <Route path="/dispensing" element={<PharmacyPage darkMode={darkMode} initialTab="dispensing" />} />
          <Route path="/prescriptions" element={<PharmacyPage darkMode={darkMode} initialTab="dispensing" />} />
          <Route
            path="/laboratory"
            element={
              <ProtectedRoute permission="lab:write">
                <LaboratoryPage darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route path="/x-ray" element={<LaboratoryPage darkMode={darkMode} initialTab="xray" />} />
          <Route path="/xray" element={<LaboratoryPage darkMode={darkMode} initialTab="xray" />} />
          <Route
            path="/billing"
            element={
              <ProtectedRoute permission="billing:read">
                <BillingPage {...pageProps} />
              </ProtectedRoute>
            }
          />
          <Route path="/staff" element={<StaffPage darkMode={darkMode} />} />
          <Route path="/prescription-ocr" element={<PrescriptionOcrPage {...pageProps} />} />
          <Route path="/patient-dashboard" element={<PatientDashboardPage darkMode={darkMode} />} />
          <Route path="/doctor-workspace" element={<DoctorWorkspacePage darkMode={darkMode} />} />
          <Route path="/receptionist" element={<ReceptionistPage darkMode={darkMode} />} />
          <Route path="/settings" element={<SettingsPage {...pageProps} />} />
          <Route path="/patient-relations" element={<PatientRelationsPage darkMode={darkMode} />} />
          <Route path="/reports" element={<PatientRelationsPage darkMode={darkMode} initialTab="reports" />} />
          <Route path="/complaints" element={<PatientRelationsPage darkMode={darkMode} initialTab="complaints" />} />
          <Route path="/contact" element={<PatientRelationsPage darkMode={darkMode} initialTab="contact" />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) queryClient.clear();
  }, [loading, user]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {loading ? (
          <AppLoading />
        ) : (
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : <LoginPage />}
            />
            <Route
              path="/forgot-password"
              element={<ForgotPasswordPage />}
            />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route
              path="*"
              element={user ? <AuthenticatedRoutes /> : <Navigate to="/login" replace />}
            />
          </Routes>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

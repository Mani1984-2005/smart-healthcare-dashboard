import { Navigate, Route, Routes } from "react-router-dom";
import Part6Layout from "./layout/Part6Layout";
import SignIn from "./pages/SignIn";
import Overview from "./pages/Overview";
import Identity from "./pages/Identity";
import Resources from "./pages/Resources";
import Bundles from "./pages/Bundles";
import Validation from "./pages/Validation";
import Consent from "./pages/Consent";
import Sharing from "./pages/Sharing";
import Security from "./pages/Security";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import GuidedDemo from "./pages/GuidedDemo";
import { usePart6Auth } from "./store/authStore";

/** Root of the standalone Part 6 module. Own auth boundary: nothing renders without a Part 6 session. */
export default function Part6App() {
  const token = usePart6Auth((s) => s.token);
  if (!token) return <SignIn />;
  return (
    <Routes>
      <Route element={<Part6Layout />}>
        <Route index element={<Overview />} />
        <Route path="identity" element={<Identity />} />
        <Route path="resources" element={<Resources />} />
        <Route path="bundles" element={<Bundles />} />
        <Route path="validation" element={<Validation />} />
        <Route path="consent" element={<Consent />} />
        <Route path="sharing" element={<Sharing />} />
        <Route path="security" element={<Security />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="demo" element={<GuidedDemo />} />
        <Route path="*" element={<Navigate to="/part6" replace />} />
      </Route>
    </Routes>
  );
}

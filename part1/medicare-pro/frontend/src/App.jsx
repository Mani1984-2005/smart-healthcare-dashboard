import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ToastStack } from './components/common/Toast';
import { UploadPage } from './pages/UploadPage';
import { PrescriptionsPage } from './pages/PrescriptionsPage';
import { PrescriptionDetailPage } from './pages/PrescriptionDetailPage';
import { useToast } from './hooks/useToast';

export default function App() {
  const { toasts, push, dismiss } = useToast();

  return (
    <div className="min-h-screen flex flex-col bg-paper dark:bg-paper-dark text-ink dark:text-ink-faint transition-colors duration-300">
      <Navbar />

      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<UploadPage pushToast={push} />} />
          <Route path="/prescriptions" element={<PrescriptionsPage pushToast={push} />} />
          <Route path="/prescriptions/:id" element={<PrescriptionDetailPage pushToast={push} />} />
          <Route
            path="*"
            element={
              <div className="flex-1 flex items-center justify-center py-24">
                <p className="text-ink-light dark:text-ink-faint">Page not found.</p>
              </div>
            }
          />
        </Routes>
      </main>

      <Footer />
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

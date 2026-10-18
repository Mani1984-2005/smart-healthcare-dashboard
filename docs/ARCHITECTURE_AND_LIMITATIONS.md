# MediCare Pro — Architecture and Technical Limitations

## 1. System Architecture & Frontend Framework
- **Framework**: React 19 SPA powered by Vite 8 and Tailwind CSS for styling.
- **Routing**: Client-side routing via `react-router-dom` (`src/App.jsx`).
- **State Management**: TanStack Query (`@tanstack/react-query`) for asynchronous data fetching/mutations combined with React context and client-side stores (`src/stores/`, `src/context/`).
- **Major Modules**:
  - Dashboard (`src/pages/Dashboard.jsx`)
  - Patients Management (`src/pages/PatientsPage.jsx`, `src/components/patient/`)
  - Appointments & Scheduling (`src/pages/AppointmentsPage.jsx`)
  - Consultations & E-Prescriptions (`src/pages/ConsultationsPage.jsx`, `src/pages/PharmacyPage.jsx`)
  - Laboratory & Specimen Tracking (`src/pages/LaboratoryPage.jsx`, `src/components/laboratory/`)
  - Billing & Invoicing (`src/pages/BillingPage.jsx`, `src/utils/billingStorage.js`)

---

## 2. Storage Mechanisms & Source Files
- **Storage**: Client-side browser `localStorage` and memory stores.
- **Key Source Files**:
  - `src/App.jsx`: Root application router and layout mounting.
  - `src/stores/`: Zustand or custom React hooks handling local entity state.
  - `src/utils/`: PDF export (`jspdf`, `html2canvas`), billing numeric sanitization, validation helpers.
  - `tests/`: Comprehensive regression test suite (`tests/*.test.js`).

---

## 3. Backend Connections vs. Local Simulations
- **Verified Facts**: The frontend client runs fully in-browser with mock/local storage persistence. Express server code exists in `/backend` for future integration scaffolding but is not actively connected to the frontend production client in the current AI Studio preview runtime.
- **Local Simulations**: Patient records, lab specimens, prescriptions, and billing invoices persist to browser `localStorage` rather than a remote database.

---

## 4. Authentication & Authorization Boundaries
- **Current Implementation**: Client-side role selection / synthetic mock authentication.
- **Limitations**: No cryptographically enforced session tokens or server-side role validation in the active frontend preview. Role checks in backend tests (`tests/securityRemediationPhase4B.test.js`) validate middleware logic conceptually but require a fully provisioned PostgreSQL database (`127.0.0.1:5432`) to execute live database queries.

---

## 5. Persistence, Backup, and Recovery Limitations
- **Limitations**: Browser `localStorage` is volatile. Clearing site data, using private browsing windows, or changing browsers results in local data loss.
- **Recovery**: No automated cloud backup or multi-device sync is currently active. Users must rely on manual PDF exports (`src/utils/pdfExport.js`) for persistent records.

---

## 6. Security and Privacy Limitations
- **Limitations**: Data is stored unencrypted in browser storage. The application is a prototype and is not HIPAA, GDPR, or SOC2 certified. PII/PHI must not be stored in production instances without encrypted database storage and TLS transport.

---

## 7. Requirements Before Real Hospital Deployment
1. **Persistent Backend**: Connect frontend client to a secure relational database (PostgreSQL via Cloud SQL or Drizzle ORM).
2. **Server-Side Authentication**: Implement robust JWT / OAuth authentication with server-side role-based access control (RBAC).
3. **Encrypted Storage & Transport**: Enforce HTTPS/TLS in transit and encryption at rest for all patient health records (PHI).
4. **Audit Logging**: Implement tamper-evident server audit logs for all clinical writes and record accesses.
5. **Regulatory Compliance**: Complete formal security audits, penetration testing, and compliance certification (HIPAA/GDPR).

---

## 8. Summary of Facts, Assumptions & Future Plans
| Category | Status | Details |
| :--- | :--- | :--- |
| **Verified Facts** | Confirmed | 95/95 tests passing, zero lint errors, successful production build (`vite build`). |
| **Assumptions** | Acknowledged | Single-user browser session with local storage sufficiency for prototype demonstration. |
| **Future Plans** | Proposed | Full backend integration with PostgreSQL, secure Auth, and real-time cloud synchronization. |

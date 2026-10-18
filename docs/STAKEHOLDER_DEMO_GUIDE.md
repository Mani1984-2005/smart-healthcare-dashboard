# MediCare Pro — Stakeholder Demonstration Guide

## 1. Project Purpose & Prototype Scope
**MediCare Pro** is a comprehensive clinical workflow and hospital-management frontend prototype designed for hospital administrators, clinicians, and support staff. It provides a unified dashboard to manage patients, appointments, clinical consultations, e-prescriptions, laboratory orders/specimens, and billing transactions.

### Scope & Limitations
- **Frontend Prototype**: Built as a React SPA with Vite, Tailwind CSS, and TanStack Query.
- **Data Persistence**: Utilizes browser `localStorage` and client-side stores for state management across sessions.
- **Simulations**: Payment processing, external SMS notifications, and multi-device cloud synchronization are simulated or unavailable in this frontend-only release.

---

## 2. Verified Project Commands
All commands correspond directly to the project `package.json` scripts:

- **Development Server**: `npm run dev` (Runs Vite dev server on port 3000)
- **Production Build**: `npm run build` (Compiles optimized production bundle via `vite build`)
- **Linting**: `npm run lint` (Executes ESLint across codebase)
- **Test Suite**: `npm test` (Runs all 95 automated subtests across 21 test suites using Node.js test runner)
- **Production Preview**: `npm run preview` (Serves production build locally)

---

## 3. Step-by-Step Presenter Workflow

### Step 1: Dashboard Overview
1. Open the application in the browser (`http://localhost:3000` or preview URL).
2. Observe the main dashboard metrics: Total Patients, Active Appointments, Pending Lab Results, and Revenue Overview.
3. Highlight real-time status widgets and quick navigation links.

### Step 2: Patient Registration & Search
1. Navigate to the **Patients** module from the sidebar.
2. Click **Register New Patient**.
3. Enter synthetic demographic information (e.g., *Name*: John Doe, *DOB*: 1985-06-15, *Phone*: +1-555-0199, *Gender*: Male).
4. Use the search bar to locate the newly registered patient instantly by name or ID.
5. Open the patient profile modal to review details and export a PDF summary.

### Step 3: Appointment Scheduling
1. Navigate to the **Appointments** calendar/schedule module.
2. Select an available time slot or click **New Appointment**.
3. Link the appointment to the synthetic patient, assign a department/doctor, and set appointment type (Consultation, Follow-up, Emergency).
4. Verify the appointment appears correctly in the daily/weekly schedule view.

### Step 4: Clinical Consultation & E-Prescription
1. Navigate to **Consultations** or open the patient's active visit.
2. Record clinical notes, vitals (BP, temperature, heart rate), and diagnosis.
3. Issue an **E-Prescription**, selecting medications, dosage, frequency, and duration.
4. Verify prescription generation and itemization.

### Step 5: Laboratory Orders & Specimen Tracking
1. Navigate to the **Laboratory** module.
2. Review pending lab orders linked to patient visits.
3. Accession a new specimen (barcode generation, specimen type, collection timestamp).
4. Advance specimen status through collection, processing, and result entry.

### Step 6: Billing & Invoicing
1. Navigate to the **Billing** module.
2. Review itemized invoices generated from consultations, lab tests, and pharmacy orders.
3. Verify automatic calculation of subtotal, applicable taxes (GST), and net total.
4. Process a simulated payment (cash/card) and note the simulated transaction status.

### Step 7: PDF Export & Reports
1. Open a patient profile or invoice.
2. Click **Export PDF** or **Download Summary**.
3. Verify the generated PDF document layout and data accuracy.

---

## 4. Expected Outcomes & Troubleshooting
- **Expected Outcome**: Instant UI response, correct calculations of totals/taxes, successful PDF download triggers, and persistent state across page reloads via browser storage.
- **Common Troubleshooting**:
  - *Blank screen or stale state*: Clear browser cache/localStorage or restart dev server (`npm run dev`).
  - *Port 3000 occupied*: Adjust port configuration in vite or terminate conflicting processes.

---

## 5. Synthetic Data Only Warning
- **Strict Compliance**: Use synthetic test records only (e.g., Test Patient Alpha, Jane Doe). Never input real patient health information (PII/PHI).

---

## 6. Simulated Features Notice
- **Payments**: Payment processing gateways are simulated. No real credit card charges occur.
- **Notifications**: SMS and email alerts are simulated locally and do not dispatch external carrier messages.
- **Cloud Sync**: Data is stored locally in the browser (`localStorage`) and does not automatically sync across separate user devices without a backend server.

---

## 7. Browser Storage Persistence & Data-Loss Risks
- **Storage Mechanism**: Browser `localStorage` and client state.
- **Risk**: Clearing browser browsing data, using private/incognito mode, or switching browsers will reset local demo records. Export important summaries as PDFs before clearing storage.

---

## 8. Final Rehearsal Checklist
- [ ] Verify dev server runs cleanly (`npm run dev`).
- [ ] Confirm patient registration and search work smoothly.
- [ ] Test appointment creation and calendar view.
- [ ] Check consultation notes and e-prescription flow.
- [ ] Review lab accessioning and specimen tracking.
- [ ] Verify billing calculations and invoice generation.
- [ ] Confirm PDF export triggers successfully.

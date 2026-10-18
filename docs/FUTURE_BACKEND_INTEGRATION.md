# MediCare Pro — Future Backend Integration Roadmap

> **Notice**: This document outlines proposed architecture and API specifications for future backend integration. **No backend code, database schemas, migrations, or active backend connections are implemented or modified in this documentation phase.**

---

## 1. Patients Module

### Current Frontend Responsibilities
- Managing patient registration form state, client-side validation, search filtering, and displaying patient profile modals with local state persistence (`localStorage`).

### Relevant Entities & Identifiers
- Entity: `Patient`
- Primary Key: `patient_id` (UUID or sequential serial)

### Existing Storage / Service Helpers
- `src/stores/patientStore.js` / local storage repository functions.

### Proposed API Operations (Proposals)
- `GET /api/patients`: Retrieve paginated list of patients with search query parameters.
- `POST /api/patients`: Register a new patient record.
- `GET /api/patients/:id`: Retrieve detailed patient profile and clinical history.
- `PUT /api/patients/:id`: Update patient demographic and contact information.

### Validation, Authorization, Audit & Testing
- **Validation**: Strict schema validation (e.g., Zod) for email, phone, and date of birth format.
- **Authorization**: Requires `patient:read` and `patient:write` roles (Doctor, Nurse, Admin).
- **Audit**: Log all patient record mutations with user ID and timestamp.
- **Testing**: Unit and integration test coverage for controllers, repositories, and middleware.

---

## 2. Appointments & Scheduling Module

### Current Frontend Responsibilities
- Managing appointment slots, calendar/schedule views, and linking appointments to specific patients and clinical departments.

### Relevant Entities & Identifiers
- Entity: `Appointment`
- Identifiers: `appointment_id`, `patient_id`, `doctor_id`

### Proposed API Operations (Proposals)
- `GET /api/appointments`: Fetch appointments by date range, department, or clinician.
- `POST /api/appointments`: Schedule a new appointment.
- `PATCH /api/appointments/:id/status`: Update appointment status (scheduled, completed, cancelled).

---

## 3. Consultations & E-Prescriptions Module

### Current Frontend Responsibilities
- Capturing clinical notes, vitals (BP, heart rate, temperature), diagnoses, and itemized medication prescriptions.

### Relevant Entities & Identifiers
- Entities: `Consultation`, `Prescription`
- Identifiers: `consultation_id`, `patient_id`, `doctor_id`, `prescription_id`

### Proposed API Operations (Proposals)
- `GET /api/consultations/:patientId`: Retrieve consultation history for a patient.
- `POST /api/consultations`: Create a new consultation record and associate vitals/diagnosis.
- `POST /api/prescriptions`: Issue and sign an e-prescription.

---

## 4. Laboratory & Specimen Tracking Module

### Current Frontend Responsibilities
- Specimen accessioning, barcode assignment, status lifecycle tracking (collected, processing, completed, rejected), and result entry.

### Relevant Entities & Identifiers
- Entities: `LabOrder`, `Specimen`
- Identifiers: `order_id`, `specimen_id`, `barcode`, `patient_id`

### Proposed API Operations (Proposals)
- `GET /api/laboratory/specimens`: List specimens and track accession status.
- `POST /api/laboratory/specimens`: Accession a new laboratory specimen.
- `PATCH /api/laboratory/specimens/:id`: Update specimen status and log integrity checks or rejection reasons.

---

## 5. Billing & Invoicing Module

### Current Frontend Responsibilities
- Itemized billing calculation, tax (GST) computation, invoice rendering, and simulated payment processing.

### Relevant Entities & Identifiers
- Entity: `Invoice`, `BillingItem`
- Identifiers: `invoice_id`, `patient_id`, `item_id`

### Proposed API Operations (Proposals)
- `GET /api/billing/invoices`: Retrieve patient invoices and payment statuses.
- `POST /api/billing/invoices`: Generate an itemized invoice for clinical/lab services.
- `POST /api/billing/payments`: Process secure payment transactions (Stripe/Payment Gateway integration).

---

## 6. Open Design Decisions
1. **Real-Time WebSockets vs. Polling**: Evaluating WebSocket connections vs. polling for live laboratory specimen updates and appointment queue changes.
2. **Offline-First Capabilities**: Determining whether to retain local IndexedDB caching with background sync upon reconnection.
3. **Multi-Tenant Hospital Support**: Designing database schema partitioning for multi-hospital enterprise deployments.

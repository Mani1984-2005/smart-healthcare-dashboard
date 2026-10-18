# MediCare Pro — Hospital Stakeholder Demonstration Package

## 1. Presenter Script (5–7 Minutes)

### [0:00 – 1:00] Introduction & Dashboard Overview
> "Hello everyone, and welcome to the walkthrough of **MediCare Pro**, our unified clinical workflow and hospital-management workspace. Today, I'll demonstrate how MediCare Pro streamlines daily hospital operations—from patient intake and appointment scheduling to clinical consultations, laboratory tracking, and itemized billing. Let's start right here on the executive dashboard, where administrators get an instant, real-time view of active patient counts, scheduled appointments, pending laboratory orders, and revenue summaries."

### [1:00 – 2:00] Patient Registration & Instant Search
> "Let's register a new synthetic patient for today's visit. I'll navigate to the **Patients** module and click **Register New Patient**. We'll enter synthetic details: Patient Name *Jane Doe*, Date of Birth *1985-04-12*, and Contact *+1-555-0144*. Once registered, the patient appears instantly in our searchable directory. Clicking on the patient opens their comprehensive health profile, where clinicians can review visit history and export a PDF health summary with a single click."

### [2:00 – 3:00] Appointment Scheduling
> "Next, let's schedule an appointment for Jane Doe. In the **Appointments** module, we select an available time slot, link our synthetic patient, assign the attending physician and department (e.g., Cardiology or General Medicine), and categorize the visit type. The appointment instantly updates the daily schedule and links directly to the patient's record."

### [3:00 – 4:00] Clinical Consultation & E-Prescriptions
> "During the consultation, the clinician opens the patient visit to record vital signs—such as blood pressure, heart rate, and temperature—along with diagnostic notes. From there, the clinician issues an **E-Prescription**, specifying medications, dosage, frequency, and duration. This itemizes the prescription directly into the patient's care plan and billing queue."

### [4:00 – 4:45] Laboratory Order & Specimen Tracking
> "If diagnostic tests are needed, the clinician orders laboratory panels. In the **Laboratory** module, staff accession the specimen, generate a unique barcode, and track its lifecycle from collection and processing to final result entry. Every specimen is tied directly to the patient's unique identifier."

### [4:45 – 5:30] Billing, GST & Itemized Invoicing
> "At the conclusion of the visit, the **Billing** module aggregates charges from consultations, lab orders, and pharmacy prescriptions. Notice how the system automatically calculates subtotals, applicable taxes (GST), and net totals with strict numeric safety. Staff can record simulated payments and generate a clean, itemized invoice PDF."

### [5:30 – 7:00] Conclusion, Scope Review & Stakeholder Q&A
> "To summarize, MediCare Pro delivers a lightning-fast, cohesive frontend clinical workspace with 100% passing automated test coverage. Before opening the floor to your questions, let's discuss your specific hospital workflows and deployment requirements."

---

## 2. Synthetic Patient Journey Reference
1. **Registration**: Register synthetic patient (e.g., *Jane Doe*, DOB: *1985-04-12*).
2. **Search**: Locate patient instantly in the directory search.
3. **Appointment**: Schedule and link appointment to patient.
4. **Consultation**: Record vitals, diagnosis, and issue e-prescription.
5. **Laboratory**: Accession specimen and track through collection/processing.
6. **Billing**: Review itemized invoice, check GST calculation, and process simulated payment.
7. **Export**: Download patient summary or invoice PDF.

---

## 3. Simulated or Unavailable Integrations
- **Payment Processing**: Payment gateways are simulated locally for demonstration purposes; no real credit card transactions occur.
- **External Notifications**: SMS and email alerts are simulated locally and do not dispatch carrier messages.
- **Cloud Synchronization**: Data persists locally in browser `localStorage`. Multi-device synchronization requires the upcoming backend server integration.

---

## 4. Stakeholder Discovery Questions
1. **Workflow Alignment**: How do your current intake and triage workflows differ from this multi-step patient journey?
2. **User Roles**: What specific access privileges do your physicians, nurses, pharmacists, and billing clerks require?
3. **Reporting Requirements**: What key operational reports (e.g., daily revenue, lab turnaround times, bed occupancy) are critical for your administration?
4. **Deployment & Security**: What are your timeline expectations and compliance requirements (e.g., HIPAA/GDPR, on-premise vs. cloud hosting) for production deployment?

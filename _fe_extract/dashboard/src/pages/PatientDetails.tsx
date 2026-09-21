import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientStore } from "../stores/patientStore.ts";
import { useBillingStore } from "../stores/billingStore.ts";
import { useAppointmentsStore } from "../stores/appointmentsStore.ts";
import { useLabStore } from "../stores/labStore.ts";
import { usePharmacyStore } from "../stores/pharmacyStore.ts";
import { useAuthStore } from "../store/authStore.js";
import Button from "../components/common/Button.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import Badge from "../components/common/Badge.jsx";
import DownloadMedicalRecordAction from "../components/patients/DownloadMedicalRecordAction.tsx";
import QRCodeCard from "../components/common/QRCodeCard.tsx";
import { encodeQrReference } from "../lib/qr/qrReference.ts";

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedPatient, setSelectedPatient, loading, error, clearSelectedPatient } = usePatientStore();
  const { invoices, loadInvoices } = useBillingStore();
  const { appointments } = useAppointmentsStore();
  const { tests } = useLabStore();
  const { prescriptions } = usePharmacyStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (id) {
      setSelectedPatient(id);
    }
    loadInvoices();
    return () => clearSelectedPatient();
  }, [id, setSelectedPatient, clearSelectedPatient, loadInvoices]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-10 shadow-card dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded-3xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-6 w-1/2 rounded-3xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-48 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Unable to load patient" description={error} />;
  }

  if (!selectedPatient) {
    return <EmptyState title="Patient not found" description="Please return to the patient list and select a valid patient record." />;
  }

  const patientInvoices = invoices.filter((invoice) => invoice.patientId === selectedPatient.id);
  const patientAppointments = appointments.filter((a) => a.patientId === selectedPatient.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const patientLabTests = tests.filter((t) => t.patientId === selectedPatient.id);
  const patientPrescriptions = prescriptions.filter((p) => p.patientId === selectedPatient.id);
  const currentUserLabel = user?.name ? `${user.name}${user.role ? ` (${user.role})` : ""}` : "Authorized staff member";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(300px,360px)_1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Patient profile</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{selectedPatient.fullName}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedPatient.id}</p>
            </div>
            <div className="text-right">
              <Badge variant={selectedPatient.status === "Critical" ? "danger" : selectedPatient.status === "Active" ? "success" : "neutral"}>{selectedPatient.status}</Badge>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Registered {selectedPatient.registrationDate}</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Email:</span> {selectedPatient.email}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Phone:</span> {selectedPatient.phone}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Age / Gender:</span> {selectedPatient.age} / {selectedPatient.gender}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Blood group:</span> {selectedPatient.bloodGroup}</p>
            <p><span className="font-semibold text-slate-900 dark:text-slate-100">Address:</span> {selectedPatient.address}</p>
          </div>
          <div className="mt-8 rounded-[1.5rem] bg-slate-50 p-4 text-sm dark:bg-slate-900">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Medical history</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {selectedPatient.medicalHistory.length > 0 ? (
                selectedPatient.medicalHistory.map((entry, index) => (
                  <li key={index} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-950">{entry}</li>
                ))
              ) : (
                <li className="rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-950">No medical history recorded.</li>
              )}
            </ul>
          </div>
          <Button className="mt-6" onClick={() => navigate("/patients")}>Back to list</Button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <QRCodeCard value={encodeQrReference("PATIENT", selectedPatient.id)} label="Patient QR" filename={`patient-${selectedPatient.id}`} />
            <DownloadMedicalRecordAction patient={selectedPatient} invoices={invoices} currentUserLabel={currentUserLabel} />
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Billing history</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">{patientInvoices.length} invoice{patientInvoices.length === 1 ? "" : "s"}</span>
            </div>
            {patientInvoices.length > 0 ? (
              <div className="mt-4 space-y-2">
                {patientInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{invoice.department} · {invoice.billingDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">₹{invoice.grandTotal.toLocaleString("en-IN")}</p>
                      <Badge variant={invoice.status === "Paid" ? "success" : invoice.status === "Overdue" ? "danger" : "warning"}>{invoice.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No billing records on file for this patient yet.</p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Appointment history</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">{patientAppointments.length} appointment{patientAppointments.length === 1 ? "" : "s"}</span>
            </div>
            {patientAppointments.length > 0 ? (
              <div className="mt-4 space-y-2">
                {patientAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{appointment.type} with {appointment.doctorName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{appointment.department} · {appointment.date} {appointment.time}</p>
                    </div>
                    <Badge variant={appointment.status === "Completed" ? "success" : appointment.status === "Cancelled" || appointment.status === "No-show" ? "danger" : "neutral"}>{appointment.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No appointments on file for this patient yet.</p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Laboratory results</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">{patientLabTests.length} test{patientLabTests.length === 1 ? "" : "s"}</span>
            </div>
            {patientLabTests.length > 0 ? (
              <div className="mt-4 space-y-2">
                {patientLabTests.map((test) => (
                  <div key={test.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{test.testName}</p>
                      <Badge variant={test.status === "Completed" ? "success" : "warning"}>{test.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{test.category} · Ordered {test.orderDate}</p>
                    {test.result && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{test.result}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No lab tests on file for this patient yet.</p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Prescriptions</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">{patientPrescriptions.length} prescription{patientPrescriptions.length === 1 ? "" : "s"}</span>
            </div>
            {patientPrescriptions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {patientPrescriptions.map((rx) => (
                  <div key={rx.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{rx.medicineName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{rx.dosage} · {rx.frequency} · {rx.duration}</p>
                    </div>
                    <Badge variant={rx.status === "Active" ? "success" : "neutral"}>{rx.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No prescriptions on file for this patient yet.</p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Consultation notes and diagnoses aren't tracked per patient in this build yet — appointments, lab results, and prescriptions are.
          </div>
        </div>
      </section>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { IconButton } from "../ui";
import Toast from "./Toast.jsx";
import QRScannerModal from "./QRScannerModal.tsx";
import { decodeQrReference } from "../../lib/qr/qrReference.ts";
import { usePatientStore } from "../../stores/patientStore.ts";
import { useDoctorsStore } from "../../stores/doctorsStore.ts";
import { useAppointmentsStore } from "../../stores/appointmentsStore.ts";
import { useBillingStore } from "../../stores/billingStore.ts";
import { useLabStore } from "../../stores/labStore.ts";
import { usePharmacyStore } from "../../stores/pharmacyStore.ts";
import { useContactsStore } from "../../stores/contactsStore.ts";

export default function GlobalQrScanner() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" | "info" } | null>(null);

  const { patients } = usePatientStore();
  const { doctors } = useDoctorsStore();
  const { appointments } = useAppointmentsStore();
  const { invoices } = useBillingStore();
  const { tests } = useLabStore();
  const { prescriptions } = usePharmacyStore();
  const { contacts } = useContactsStore();

  const handleResult = (decodedText: string) => {
    setOpen(false);
    const reference = decodeQrReference(decodedText);
    if (!reference) {
      setToast({ message: "That QR code isn't a MediCare Pro record code.", variant: "danger" });
      return;
    }

    switch (reference.type) {
      case "PATIENT": {
        const patient = patients.find((p) => p.id === reference.id);
        if (patient) { navigate(`/patients/${patient.id}`); setToast({ message: `Opening ${patient.fullName}'s medical profile.`, variant: "success" }); }
        else setToast({ message: `No patient found for ${reference.id}.`, variant: "danger" });
        return;
      }
      case "DOCTOR": {
        const doctor = doctors.find((d) => d.id === reference.id);
        navigate("/doctors");
        setToast(doctor ? { message: `Found ${doctor.name} in the directory.`, variant: "success" } : { message: `No doctor found for ${reference.id}.`, variant: "danger" });
        return;
      }
      case "APPOINTMENT": {
        const appointment = appointments.find((a) => a.id === reference.id);
        navigate("/appointments");
        setToast(appointment ? { message: `Found appointment for ${appointment.patientName}.`, variant: "success" } : { message: `No appointment found for ${reference.id}.`, variant: "danger" });
        return;
      }
      case "INVOICE": {
        const invoice = invoices.find((i) => i.id === reference.id);
        navigate("/billing");
        setToast(invoice ? { message: `Verified invoice ${invoice.invoiceNumber} — ${invoice.status}.`, variant: "success" } : { message: `No invoice found for ${reference.id}.`, variant: "danger" });
        return;
      }
      case "LAB": {
        const test = tests.find((t) => t.id === reference.id);
        navigate("/laboratory");
        setToast(test ? { message: `Found lab test: ${test.testName} (${test.status}).`, variant: "success" } : { message: `No lab test found for ${reference.id}.`, variant: "danger" });
        return;
      }
      case "PRESCRIPTION": {
        const rx = prescriptions.find((p) => p.id === reference.id);
        navigate("/pharmacy");
        setToast(rx ? { message: `Found prescription: ${rx.medicineName}.`, variant: "success" } : { message: `No prescription found for ${reference.id}.`, variant: "danger" });
        return;
      }
      case "CONTACT": {
        const contact = contacts.find((c) => c.id === reference.id);
        navigate("/contacts");
        setToast(contact ? { message: `Found contact: ${contact.name}.`, variant: "success" } : { message: `No contact found for ${reference.id}.`, variant: "danger" });
        return;
      }
      default:
        setToast({ message: "Unrecognized QR code.", variant: "danger" });
    }
  };

  return (
    <>
      <IconButton label="Scan QR code" onClick={() => setOpen(true)}>
        <ScanLine className="h-4 w-4" />
      </IconButton>
      <QRScannerModal open={open} onClose={() => setOpen(false)} onResult={handleResult} />
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </>
  );
}

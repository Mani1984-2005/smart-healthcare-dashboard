import { useState, useEffect } from "react";
import jsPDF from "jspdf";

const initialPatients = [
  {
    id: "PAT-1001",
    name: "Ravi Kumar",
    age: "32",
    gender: "Male",
    bloodGroup: "O+",
    phone: "9876543210",
    disease: "Fever",
    address: "Davangere",
    registeredDate: "2026-06-15",
    photo: "",
  },
];

export default function PatientsPage({ darkMode }) {
  const [patients, setPatients] = useState(() => {
    return JSON.parse(localStorage.getItem("patients")) || initialPatients;
  });

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
   const bills = JSON.parse(localStorage.getItem("billing_v2")) || [];

const patientBills = selectedPatient
  ? bills.filter(
      (bill) =>
        bill.patientName?.toLowerCase() === selectedPatient.name?.toLowerCase() ||
        bill.patientId === selectedPatient.id
    )
  : [];

const labTests = JSON.parse(localStorage.getItem("lab_tests")) || [];

const patientLabTests = selectedPatient
  ? labTests.filter(
      (test) =>
        test.patientName?.toLowerCase() === selectedPatient.name?.toLowerCase() ||
        test.patientId === selectedPatient.id
    )
  : []; 
    const appointments = JSON.parse(localStorage.getItem("appointments")) || [];

const patientAppointments = selectedPatient
  ? appointments.filter(
      (apt) =>
        apt.patient?.toLowerCase() === selectedPatient.name?.toLowerCase() ||
        apt.phone === selectedPatient.phone
    )
  : [];
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
    phone: "",
    disease: "",
    address: "",
    emergencyContact: "",
    allergies: "",
    medicalHistory: "",
    visitNotes: "",
    photo: "",
   photoSource: "Browse Photo",

  });

  useEffect(() => {
    localStorage.setItem("patients", JSON.stringify(patients));
  }, [patients]);

  const inputClass = "border p-3 rounded-lg text-slate-900";

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, photo: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const generatePatientPDF = (patient) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("MediCare Pro", 20, 20);
    doc.setFontSize(12);
    doc.text("Smart Healthcare System", 20, 30);

    doc.text(`Patient ID: ${patient.id}`, 20, 50);
    doc.text(`Patient Name: ${patient.name}`, 20, 60);
    doc.text(`Age: ${patient.age}`, 20, 70);
    doc.text(`Gender: ${patient.gender}`, 20, 80);
    doc.text(`Blood Group: ${patient.bloodGroup}`, 20, 90);
    doc.text(`Phone: ${patient.phone}`, 20, 100);
    doc.text(`Disease: ${patient.disease}`, 20, 110);
    doc.text(`Address: ${patient.address}`, 20, 120);
    doc.text(`Registered Date: ${patient.registeredDate}`, 20, 130);

    doc.save(`${patient.id}_receipt.pdf`);
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(search.toLowerCase()) ||
      patient.id.toLowerCase().includes(search.toLowerCase()) ||
      patient.phone.includes(search)
  );

  const resetForm = () => {
    setForm({
      name: "",
      age: "",
      gender: "Male",
      bloodGroup: "O+",
      phone: "",
      disease: "",
      address: "",
      emergencyContact: "",
      allergies: "",
      medicalHistory: "",
      visitNotes: "",
      photo: "",
      photoSource: "Browse Photo",
    });
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name || !form.age || !form.phone || !form.disease || !form.address) {
      alert("Please fill all required fields");
      return;
    }

    if (editingId) {
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === editingId ? { ...patient, ...form } : patient
        )
      );
      resetForm();
      return;
    }

    const newPatient = {
      id: `PAT-${Date.now()}`,
      ...form,
      registeredDate: new Date().toISOString().split("T")[0],
    };

    setPatients([newPatient, ...patients]);
    resetForm();
  };

  const handleEdit = (patient) => {
    setEditingId(patient.id);
    setForm({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      phone: patient.phone,
      disease: patient.disease,
      address: patient.address,
      emergencyContact: patient.emergencyContact || "",
      allergies: patient.allergies || "",
      medicalHistory: patient.medicalHistory || "",
      visitNotes: patient.visitNotes || "",
      photo: patient.photo || "",
     photoSource: patient.photoSource || "Browse Photo",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this patient?")) return;
    setPatients(patients.filter((patient) => patient.id !== id));
  };
     
  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Patients</h1>
      <p className="text-slate-500 mt-2">Register, search, edit and manage patient records.</p>

      <form onSubmit={handleSubmit} className={`mt-6 p-5 rounded-xl shadow grid grid-cols-1 md:grid-cols-4 gap-3 ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <input className={inputClass} placeholder="Patient Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputClass} placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />

        <select className={inputClass} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>

        <select className={inputClass} value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
          <option>O+</option>
          <option>O-</option>
          <option>A+</option>
          <option>A-</option>
          <option>B+</option>
          <option>B-</option>
          <option>AB+</option>
          <option>AB-</option>
        </select>

        <input className={inputClass} placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={inputClass} placeholder="Disease / Condition" value={form.disease} onChange={(e) => setForm({ ...form, disease: e.target.value })} />
        <input className={inputClass} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className={inputClass} placeholder="Emergency Contact" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />

        <select
  className={inputClass}
  value={form.photoSource}
  onChange={(e) => setForm({ ...form, photoSource: e.target.value })}
>
  <option>Browse Photo</option>
  <option>Live Camera</option>
  <option>Scanned Photo Copy</option>
  <option>WhatsApp Pending</option>
</select>

{form.photoSource === "Browse Photo" && (
  <input
    className={inputClass}
    type="file"
    accept="image/*"
    onChange={handlePhotoUpload}
  />
)}

{form.photoSource === "Live Camera" && (
  <>
    <input
      className={inputClass}
      type="file"
      accept="image/*"
      capture="user"
      onChange={handlePhotoUpload}
    />

    <p className="text-xs text-slate-500 md:col-span-2">
      On mobile, tap this field to open the camera and take patient photo.
    </p>
  </>
)}
{form.photoSource === "Scanned Photo Copy" && (
  <input
    className={inputClass}
    type="file"
    accept="image/*,.pdf"
    onChange={handlePhotoUpload}
  />
)}

{form.photoSource === "WhatsApp Pending" && (
  <p className="p-3 rounded-lg bg-yellow-100 text-yellow-800">
    Ask patient to share photo through WhatsApp.
  </p>
)}

        <input className={inputClass} placeholder="Allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
        <input className={inputClass} placeholder="Medical History" value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} />
        <input className={inputClass} placeholder="Visit Notes" value={form.visitNotes} onChange={(e) => setForm({ ...form, visitNotes: e.target.value })} />

        <button className="bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700">
          {editingId ? "Update Patient" : "Register Patient"}
        </button>

        {editingId && (
          <button type="button" onClick={resetForm} className="bg-slate-700 text-white rounded-lg font-semibold">
            Cancel Edit
          </button>
        )}
      </form>

      <input
        className="mt-6 w-full md:w-96 border p-3 rounded-lg text-slate-900"
        placeholder="Search by name, ID or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={`mt-6 rounded-xl shadow overflow-x-auto ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <table className="w-full text-sm min-w-[1200px]">
          <thead className="bg-cyan-600 text-white">
            <tr>
              <th className="p-3 text-left">Photo</th>
              <th className="p-3 text-left">Patient ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Age</th>
              <th className="p-3 text-left">Gender</th>
              <th className="p-3 text-left">Blood</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Disease</th>
              <th className="p-3 text-left">Address</th>
              <th className="p-3 text-left">Registered</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className={`border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
  <td className="p-3">
                  {patient.photo ? (
                    <img src={patient.photo} alt={patient.name} className="w-12 h-12 rounded-full object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center text-slate-700">👤</div>
                  )}
                </td>

                <td className="p-3 font-bold text-cyan-500">{patient.id}</td>
                <td className="p-3 font-medium">{patient.name}</td>
                <td className="p-3">{patient.age}</td>
                <td className="p-3">{patient.gender}</td>
                <td className="p-3">{patient.bloodGroup}</td>
                <td className="p-3">{patient.phone}</td>
                <td className="p-3">{patient.disease}</td>
                <td className="p-3">{patient.address}</td>
                <td className="p-3">{patient.registeredDate}</td>

                <td className="p-3 flex gap-2 flex-wrap">
                  <button onClick={() => handleEdit(patient)} className="bg-yellow-500 text-white px-3 py-1 rounded-lg">Edit</button>
                  <button onClick={() => setSelectedPatient(patient)} className="bg-cyan-600 text-white px-3 py-1 rounded-lg">View</button>
                  <button onClick={() => generatePatientPDF(patient)} className="bg-green-600 text-white px-3 py-1 rounded-lg">PDF</button>
                  <button onClick={() => handleDelete(patient.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg">Delete</button>
                </td>
              </tr>
            ))}

            {filteredPatients.length === 0 && (
              <tr>
                <td colSpan="11" className="p-5 text-center text-slate-500">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
{selectedPatient && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
    <div className={`w-full max-w-3xl rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto ${darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Patient Profile</h2>
        <button onClick={() => setSelectedPatient(null)} className="text-2xl font-bold">×</button>
      </div>

      <div className="flex justify-center mb-4">
        {selectedPatient.photo ? (
          <img src={selectedPatient.photo} alt={selectedPatient.name} className="w-28 h-28 rounded-full object-cover border" />
        ) : (
          <div className="w-28 h-28 rounded-full bg-slate-300 flex items-center justify-center text-4xl">👤</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <p><b>ID:</b> {selectedPatient.id}</p>
        <p><b>Name:</b> {selectedPatient.name}</p>
        <p><b>Age:</b> {selectedPatient.age}</p>
        <p><b>Gender:</b> {selectedPatient.gender}</p>
        <p><b>Blood Group:</b> {selectedPatient.bloodGroup}</p>
        <p><b>Phone:</b> {selectedPatient.phone}</p>
        <p><b>Disease:</b> {selectedPatient.disease}</p>
        <p><b>Address:</b> {selectedPatient.address}</p>
        <p><b>Emergency Contact:</b> {selectedPatient.emergencyContact || "-"}</p>
        <p><b>Allergies:</b> {selectedPatient.allergies || "-"}</p>
        <p><b>Medical History:</b> {selectedPatient.medicalHistory || "-"}</p>
        <p><b>Visit Notes:</b> {selectedPatient.visitNotes || "-"}</p>
      </div>

      <div className="mt-5 border-t pt-4">
        <h3 className="font-bold text-lg mb-3 text-cyan-600">📊 Patient Summary</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-cyan-100 text-center text-slate-900">
            <h4 className="font-bold">Appointments</h4>
           <p>{patientAppointments.length}</p>
          </div>
             
          <div className="p-3 rounded-lg bg-green-100 text-center text-slate-900">
            <h4 className="font-bold">Bills</h4>
            <p>{patientBills.length}</p>
          </div>
         
          <div className="p-3 rounded-lg bg-yellow-100 text-center text-slate-900">
            <h4 className="font-bold">Lab Tests</h4>
            <p>{patientLabTests.length}</p>
          </div>

          <div className="p-3 rounded-lg bg-purple-100 text-center text-slate-900">
            <h4 className="font-bold">Documents</h4>
            <p>0</p>
          </div>
        </div>
      </div>
          <div className="mt-6">
  <h3 className="font-bold text-green-600 mb-2">
    📄 Recent Bills
  </h3>

  {patientBills.length > 0 ? (
    patientBills.map((bill) => (
      <div key={bill.billId} className="border p-2 rounded mb-2">
        {bill.billId} - ₹{bill.grandTotal} - {bill.paymentStatus}
      </div>
    ))
  ) : (
    <p>No billing records found.</p>
  )}
</div>

<div className="mt-6">
  <h3 className="font-bold text-yellow-600 mb-2">
    🧪 Recent Lab Tests
  </h3>

  {patientLabTests.length > 0 ? (
    patientLabTests.map((test) => (
      <div key={test.testId} className="border p-2 rounded mb-2">
        {test.testName} - {test.status}
      </div>
    ))
  ) : (
    <p>No lab records found.</p>
  )}
</div>
      <div className="mt-6 text-right">
        <button onClick={() => setSelectedPatient(null)} className="bg-cyan-600 text-white px-4 py-2 rounded-lg">
          Close
        </button>
        <div className="mt-6">
  <h3 className="font-bold text-blue-600 mb-2">
    📅 Appointment History
  </h3>

  {patientAppointments.length > 0 ? (
    patientAppointments.map((apt) => (
      <div key={apt.id} className="border p-2 rounded mb-2">
        {apt.token} - {apt.doctor} - {apt.date} {apt.time} - {apt.status}
      </div>
    ))
  ) : (
    <p>No appointment records found.</p>
  )}
</div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
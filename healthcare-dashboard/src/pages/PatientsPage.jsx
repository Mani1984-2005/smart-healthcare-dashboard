import { PATIENTS } from "../data/patients";

export default function PatientsPage() {
  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
      <p className="text-slate-500 mt-2">Manage patient records.</p>

      <div className="mt-6 bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cyan-600 text-white">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Age</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Disease</th>
            </tr>
          </thead>
          <tbody>
            {PATIENTS.map((patient) => (
              <tr key={patient.id} className="border-b">
                <td className="p-3">{patient.name}</td>
                <td className="p-3">{patient.age}</td>
                <td className="p-3">{patient.phone}</td>
                <td className="p-3">{patient.disease}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
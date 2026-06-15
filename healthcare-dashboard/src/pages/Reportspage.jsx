export default function ReportsPage({ darkMode, appointments = [] }) {
  const reports = [
    { title: "Total Patients", value: 24, icon: "🧑‍⚕️" },
    { title: "Total Doctors", value: 12, icon: "👨‍⚕️" },
    { title: "Total Appointments", value: appointments.length, icon: "📅" },
    { title: "Total Staff", value: 18, icon: "👥" },
  ];

  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Reports</h1>
      <p className="text-slate-500 mt-2">Hospital performance summary.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        {reports.map((item) => (
          <div key={item.title} className={`p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
            <div className="text-3xl">{item.icon}</div>
            <p className="text-sm text-slate-500 mt-3">{item.title}</p>
            <h2 className="text-3xl font-bold mt-1">{item.value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
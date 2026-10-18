// src/components/StatCards.jsx
import { DOCTORS } from "../data/doctors";
import { MEDICINES } from "../data/medicines";
import { STAFF } from "../data/staff";

export default function StatCards({ darkMode }) {
  const availableDoctors = DOCTORS.filter((d) => d.status === "Available").length;
  const availableMedicines = MEDICINES.filter((m) => m.stock === "Available").length;

  const stats = [
    { label: "Total Doctors", value: DOCTORS.length, icon: "👨‍⚕️", sub: `${availableDoctors} available`, color: "cyan" },
    { label: "Available Doctors", value: availableDoctors, icon: "✅", sub: "Ready to consult", color: "green" },
    { label: "Total Staff", value: STAFF.length, icon: "👥", sub: `${STAFF.filter(s => s.attendance === "Present").length} present today`, color: "blue" },
    { label: "Medicines Available", value: availableMedicines, icon: "💊", sub: `${MEDICINES.length} total in inventory`, color: "purple" },
  ];

  const colorMap = {
    cyan:   { bg: darkMode ? "bg-cyan-950"   : "bg-cyan-50",   text: "text-cyan-400",   border: "border-cyan-800"   },
    green:  { bg: darkMode ? "bg-green-950"  : "bg-green-50",  text: "text-green-400",  border: "border-green-800"  },
    blue:   { bg: darkMode ? "bg-blue-950"   : "bg-blue-50",   text: "text-blue-400",   border: "border-blue-800"   },
    purple: { bg: darkMode ? "bg-purple-950" : "bg-purple-50", text: "text-purple-400", border: "border-purple-800" },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const c = colorMap[stat.color];
        return (
          <div
            key={stat.label}
            className={`rounded-2xl border p-5 flex flex-col gap-1 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-1 ${c.bg}`}>
              {stat.icon}
            </div>
            <p className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{stat.label}</p>
            <p className={`text-3xl font-black ${c.text}`}>{stat.value}</p>
            <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{stat.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
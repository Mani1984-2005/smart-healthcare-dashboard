// src/pages/HomePage.jsx
export default function HomePage({ darkMode, setPage }) {
  const services = [
    { icon: "❤️", title: "Cardiology", desc: "Advanced heart care with 24/7 monitoring" },
    { icon: "🧠", title: "Neurology", desc: "Expert neurological diagnosis and treatment" },
    { icon: "🦴", title: "Orthopedics", desc: "Bone, joint and spine care specialists" },
    { icon: "🧒", title: "Pediatrics", desc: "Dedicated child health and wellness" },
    { icon: "🧪", title: "Pathology", desc: "Accurate diagnostic lab services" },
    { icon: "🚑", title: "Emergency", desc: "24/7 emergency and trauma care" },
  ];

  const stats = [
    { label: "Patients Served", val: "50,000+" },
    { label: "Expert Doctors", val: "120+" },
    { label: "Departments", val: "18" },
    { label: "Beds Available", val: "500+" },
  ];

  return (
    <div>
      {/* Hero */}
      <div className={`relative overflow-hidden ${darkMode ? "bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950" : "bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800"} py-20 px-4`}>
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            🏆 Ranked #1 Hospital in the Region
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            Your Health,<br />
            <span className="text-yellow-300">Our Priority</span>
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            MediCare Pro delivers world-class healthcare with smart technology, compassionate doctors, and a patient-first approach.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setPage("Dashboard")}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold px-6 py-3 rounded-xl transition-all shadow-lg hover:-translate-y-0.5"
            >
              Book Appointment
            </button>
            <button
              onClick={() => setPage("Doctors")}
              className="bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold px-6 py-3 rounded-xl transition-all border border-white/30 hover:-translate-y-0.5"
            >
              Our Doctors
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className={`${darkMode ? "bg-slate-800" : "bg-blue-600"} py-8`}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((item) => (
            <div key={item.label} className="text-center text-white">
              <div className="text-3xl font-black">{item.val}</div>
              <div className="text-blue-200 text-sm mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className={`py-16 px-4 ${darkMode ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className={`text-3xl font-black mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>
              Our Specializations
            </h2>
            <p className={`${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              Comprehensive healthcare services under one roof
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {services.map((item) => (
              <div
                key={item.title}
                className={`p-6 rounded-2xl border transition-all hover:-translate-y-1.5 hover:shadow-xl cursor-pointer ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 hover:border-cyan-700"
                    : "bg-white border-slate-200 hover:border-cyan-300"
                }`}
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className={`font-bold text-lg mb-1 ${darkMode ? "text-white" : "text-slate-900"}`}>
                  {item.title}
                </h3>
                <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
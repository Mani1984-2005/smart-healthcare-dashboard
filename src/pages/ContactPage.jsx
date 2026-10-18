import { PageHeader, ActionButton } from "../components/ui";

export default function ContactPage({ darkMode }) {
  const contacts = [
    { dept: "Emergency", phone: "108", email: "emergency@medicarepro.com", icon: "\uD83D\uDE91" },
    { dept: "Appointments", phone: "+91 1800-123-4567", email: "appointments@medicarepro.com", icon: "\uD83D\uDCC5" },
    { dept: "Pharmacy", phone: "+91 1800-123-4568", email: "pharmacy@medicarepro.com", icon: "\uD83D\uDC8A" },
    { dept: "Lab Services", phone: "+91 1800-123-4569", email: "lab@medicarepro.com", icon: "\uD83D\uDD2C" },
    { dept: "Billing & Insurance", phone: "+91 1800-123-4570", email: "billing@medicarepro.com", icon: "\uD83D\uDCB3" },
    { dept: "HR / Staff", phone: "+91 1800-123-4571", email: "hr@medicarepro.com", icon: "\uD83D\uDC65" },
  ];

  const card = darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900";

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-50"} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Contact & Support" subtitle="Reach the right department quickly" icon="contact" />

        <div className={`p-6 rounded-2xl border shadow-sm mb-6 ${card}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500">Your Name</label>
              <input className={`text-sm px-3 py-2.5 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "border-slate-300"}`} placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input className={`text-sm px-3 py-2.5 rounded-xl border ${darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "border-slate-300"}`} placeholder="your@email.com" type="email" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-500">Message</label>
              <textarea className={`text-sm px-3 py-2.5 rounded-xl border resize-none ${darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "border-slate-300"}`} rows={3} placeholder="How can we help you?" />
            </div>
          </div>
          <div className="mt-4">
            <ActionButton label="Send Message" variant="primary" size="md" />
          </div>
        </div>

        <h2 className={`text-lg font-bold mb-4 ${darkMode ? "text-white" : "text-slate-900"}`}>Department Directory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((c) => (
            <div key={c.dept} className={`p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${card}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{c.icon}</span>
                <h3 className="font-semibold text-sm">{c.dept}</h3>
              </div>
              <p className="text-sm font-mono">{c.phone}</p>
              <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{c.email}</p>
            </div>
          ))}
        </div>

        <div className={`mt-6 p-4 rounded-2xl border text-center text-sm ${card}`}>
          <p className="font-semibold">MediCare Pro Hospital</p>
          <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>123 Healthcare Avenue, Medical District, New Delhi 110001</p>
          <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>24/7 Helpline: 108 | info@medicarepro.com</p>
        </div>
      </div>
    </div>
  );
}

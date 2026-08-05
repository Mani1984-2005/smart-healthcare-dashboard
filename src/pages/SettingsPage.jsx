import { PageHeader, ActionButton } from "../components/ui";

export default function SettingsPage({ darkMode }) {
  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"} py-8 px-4`}>
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Settings" subtitle="Manage hospital system preferences and configuration" icon="settings" />

        <div className={`mt-6 p-6 rounded-2xl border shadow-sm ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <h2 className="text-lg font-semibold mb-4">Hospital Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className={`border p-3 rounded-xl text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "border-slate-300 text-slate-900"}`} placeholder="Hospital Name" />
            <input className={`border p-3 rounded-xl text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "border-slate-300 text-slate-900"}`} placeholder="Hospital Email" />
            <input className={`border p-3 rounded-xl text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "border-slate-300 text-slate-900"}`} placeholder="Phone Number" />
            <input className={`border p-3 rounded-xl text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" : "border-slate-300 text-slate-900"}`} placeholder="Location" />
          </div>
          <div className="mt-5">
            <ActionButton label="Save Settings" variant="primary" size="md" />
          </div>
        </div>

        <div className={`mt-6 p-6 rounded-2xl border shadow-sm ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
          {["Email Alerts", "SMS Notifications", "WhatsApp Updates", "In-App Toasts"].map((item) => (
            <div key={item} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
              <span className="text-sm">{item}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
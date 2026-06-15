export default function SettingsPage({ darkMode }) {
  return (
    <div className={`p-6 min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-slate-500 mt-2">Manage hospital system preferences.</p>

      <div className={`mt-6 p-5 rounded-xl shadow ${darkMode ? "bg-slate-900" : "bg-white"}`}>
        <h2 className="text-lg font-semibold mb-4">Hospital Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Hospital Name" />
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Hospital Email" />
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Phone Number" />
          <input className="border p-3 rounded-lg text-slate-900" placeholder="Location" />
        </div>

        <button className="mt-5 bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-cyan-700">
          Save Settings
        </button>
      </div>
    </div>
  );
}
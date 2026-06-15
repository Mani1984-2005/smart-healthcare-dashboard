// src/pages/ContactPage.jsx
export default function ContactPage({ darkMode }) {
  const contacts = [
    { label: "Address", val: "123 MediCare Road, Health Nagar, Mumbai 400001, Maharashtra, India" },
    { label: "Phone", val: "+91 22 1234 5678" },
    { label: "Emergency (24/7)", val: "+91 22 9999 0000" },
    { label: "Email", val: "care@medicarepro.in" },
    { label: "Website", val: "www.medicarepro.in" },
    { label: "OPD Hours", val: "Mon–Sat: 8:00 AM – 8:00 PM" },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950" : "bg-slate-100"} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
            Contact Us
          </h1>
          <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            We are here to help, 24 hours a day, 7 days a week.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {contacts.map((item) => (
            <div
              key={item.label}
              className={`p-5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{item.label}</p>
              <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{item.val}</p>
            </div>
          ))}
        </div>

        {/* Emergency Banner */}
        <div className="p-5 rounded-2xl bg-red-600 text-white text-center mb-8 shadow-xl">
          <p className="font-black text-xl">Medical Emergency?</p>
          <p className="text-red-100 mb-2">Call our emergency hotline immediately</p>
          <p className="font-black text-3xl">+91 22 9999 0000</p>
          <p className="text-red-200 text-sm mt-1">Available 24 hours a day, 365 days a year</p>
        </div>

      </div>
    </div>
  );
}
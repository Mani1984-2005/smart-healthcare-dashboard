// src/pages/HomePage.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, User, Phone, MapPin, Search, Star, Clock, ShieldCheck, HeartPulse, Send, Sparkles } from "lucide-react";
import { DOCTORS } from "../data/doctors";
import { HOSPITAL_CONFIG } from "../data/hospitalConfig";
import MedicalLogo from "../components/MedicalLogo";

export default function HomePage({ darkMode, user, setPage, setSelectedDoctorFromPage }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleNavigate = (targetPage) => {
    if (typeof setPage === "function") {
      setPage(targetPage);
    } else {
      if (targetPage === "Home") navigate("/");
      else if (targetPage === "Patient Relations") navigate("/patient-relations");
      else navigate(`/${targetPage.toLowerCase().replace(/\s+/g, "-")}`);
    }
  };

  const handleBookAppointment = (doctor) => {
    if (typeof setSelectedDoctorFromPage === "function") {
      setSelectedDoctorFromPage(doctor);
    }
    navigate(user ? "/dashboard" : "/login");
  };

  const departments = [
    { name: "Cardiology", icon: "❤️", desc: "Advanced heart care, ECG, echocardiography and 24/7 cardiac life support." },
    { name: "Neurology", icon: "🧠", desc: "Comprehensive diagnosis and treatment for brain, spine, and nerve disorders." },
    { name: "Orthopedics", icon: "🦴", desc: "Joint replacement, arthroscopy, spine surgery and sports medicine." },
    { name: "Pediatrics", icon: "👶", desc: "Specialized newborn care, immunizations, and pediatric wellness." },
    { name: "Dermatology", icon: "✨", desc: "Advanced dermatological care, laser therapy, and cosmetic dermatology." },
    { name: "General Medicine", icon: "🩺", desc: "Primary healthcare, chronic disease management, and preventive health checks." },
    { name: "Gynecology", icon: "🌸", desc: "Maternal care, obstetrics, minimally invasive gynecological surgery." },
    { name: "Emergency Services", icon: "🚑", desc: "24/7 trauma care, advanced life support ambulances, and critical care units." },
  ];

  const leadership = [
    {
      name: "Dr. Robert Vance, MD, FRCS",
      title: "Medical Director & Chief of Surgery",
      bio: "Over 25 years of distinguished leadership in cardiothoracic surgery and hospital governance, dedicated to clinical excellence and medical education.",
      photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80",
    },
    {
      name: "Dr. Elizabeth Cole, PhD",
      title: "Head of Research & Clinical Quality",
      bio: "Pioneering clinical researcher with over 80 publications in international medical journals, focusing on patient safety protocols and outcomes research.",
      photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
    },
  ];

  const historyMilestones = [
    { year: "1998", title: "Hospital Foundation", desc: "Established as a 50-bed community care clinic with a mission to deliver accessible medical excellence." },
    { year: "2008", title: "Advanced Trauma Center", desc: "Expanded into a 300-bed multispecialty hospital featuring 24/7 emergency and critical care infrastructure." },
    { year: "2018", title: "JCI Accreditation", desc: "Achieved international gold standard accreditation for patient safety and healthcare quality." },
    { year: "2025", title: "Smart Clinical Integration", desc: "Deployed MediCare Pro enterprise digital platform for seamless electronic health records and patient journeys." },
  ];

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return DOCTORS;
    const q = searchQuery.toLowerCase();
    return DOCTORS.filter(d => d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="w-full min-h-screen min-h-[100dvh] relative flex flex-col justify-between p-4 sm:p-6 lg:p-8 transition-colors duration-300 box-border overflow-x-hidden bg-slate-950 text-white">
      {/* Full-Viewport Hospital Background Image with Gradient Overlay — Matching LoginScreen */}
      <div 
        className="fixed inset-0 bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: `url(${HOSPITAL_CONFIG.heroBgImage})` }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300 bg-gradient-to-t from-slate-950/95 via-slate-900/80 to-slate-900/60" />

      {/* Top Header Bar — Reusing LoginScreen Visual Language */}
      <header className="relative z-20 max-w-7xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/15">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-2.5 rounded-2xl bg-cyan-600/30 backdrop-blur-md border border-cyan-400/30 shadow-lg">
            <MedicalLogo className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>
          <div>
            <div className="font-black text-white text-xl sm:text-2xl lg:text-3xl tracking-tight leading-tight">{HOSPITAL_CONFIG.hospitalName}</div>
            <div className="text-xs sm:text-sm text-cyan-300 font-semibold">{HOSPITAL_CONFIG.tagline || "Hospital Information & Patient Portal"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              try {
                if (window.history.length > 2) navigate(-1);
                else navigate('/');
              } catch {
                navigate('/');
              }
            }}
            className="px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 shadow-sm transition-all"
            title="Go Back"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 shadow-sm transition-all"
            title="Go Home"
          >
            <Home size={16} />
            <span className="hidden sm:inline">Home</span>
          </button>

          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs sm:text-sm backdrop-blur-md border border-cyan-400/40 shadow-md transition-all flex items-center gap-1.5"
            >
              <User size={16} />
              <span>Dashboard</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs sm:text-sm backdrop-blur-md border border-cyan-400/40 shadow-md transition-all flex items-center gap-1.5"
            >
              <User size={16} />
              <span>Login / Portals</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Page Content */}
      <main className="relative z-20 max-w-7xl mx-auto w-full py-8 sm:py-12 space-y-12 sm:space-y-16">
        
        {/* A. Hero Section with AI Assistant Widget */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-300 text-xs sm:text-sm font-bold uppercase tracking-wider border border-cyan-400/30 backdrop-blur-md">
              🏥 {HOSPITAL_CONFIG.hospitalName} • {HOSPITAL_CONFIG.accreditation}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Excellence in Healthcare, <br />
              <span className="text-cyan-300">Dedicated to Your Well-being</span>
            </h1>

            <p className="text-slate-100 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              {HOSPITAL_CONFIG.hospitalName} combines world-class medical expertise, cutting-edge diagnostic technology, and compassionate patient-centered care across all specializations.
            </p>

            <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2">
              <button
                onClick={() => navigate(user ? "/dashboard" : "/login")}
                className="px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm shadow-xl border border-cyan-400/40 transition-all hover:-translate-y-0.5"
              >
                Book Appointment
              </button>
              <a
                href="#departments"
                className="px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-sm border border-white/30 transition-all text-center"
              >
                Explore Departments
              </a>
              <a
                href="#doctors"
                className="px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-sm border border-white/30 transition-all text-center"
              >
                Meet Our Doctors
              </a>
            </div>

            <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-cyan-200 font-semibold">
              <span className="flex items-center gap-1.5"><Phone size={14} className="text-cyan-400" /> Emergency: {HOSPITAL_CONFIG.emergencyPhone}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-cyan-400" /> {HOSPITAL_CONFIG.location}</span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <AskRoseWidget darkMode={darkMode} />
          </div>
        </section>

        {/* B. Specialist Physicians Section */}
        <section id="doctors" className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider border border-cyan-400/30 backdrop-blur-md">
              <Sparkles size={14} /> Certified Experts
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Our Specialist Physicians</h2>
            <p className="text-slate-200 text-sm sm:text-base">
              Consult with verified medical experts across multiple clinical specializations.
            </p>

            <div className="pt-2 max-w-md mx-auto">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors by name or specialization..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-white/50 text-slate-900 placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-lg"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className="rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 text-slate-900 p-6 flex flex-col justify-between transition-all duration-300 shadow-2xl hover:shadow-3xl hover:-translate-y-1.5"
              >
                <div>
                  <div className="relative mb-5 overflow-hidden rounded-2xl aspect-[4/3] bg-slate-800">
                    <img
                      src={doctor.photo}
                      alt={doctor.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-xs font-bold text-amber-400 border border-slate-700 flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" /> {doctor.rating} ({doctor.reviews})
                    </div>
                  </div>

                  <h3 className="font-extrabold text-xl text-slate-900 mb-1">{doctor.name}</h3>
                  <p className="text-cyan-600 font-bold text-xs uppercase tracking-wider mb-4">{doctor.spec}</p>

                  <div className="grid grid-cols-2 gap-2 mb-6 text-xs p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[10px] font-medium">Experience</span>
                      <span className="font-bold text-slate-900">{doctor.exp}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] font-medium">Consultation Fee</span>
                      <span className="font-bold text-emerald-600">₹{doctor.fee || 500}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleBookAppointment(doctor)}
                  className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md transition-all"
                >
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* C. Departments Section */}
        <section id="departments" className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Departments & Specializations</h2>
            <p className="text-slate-200 text-sm sm:text-base">
              Comprehensive multidisciplinary medical departments equipped with advanced diagnostic technology.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {departments.map((dept) => (
              <div
                key={dept.name}
                className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 text-slate-900 shadow-2xl transition-all hover:shadow-3xl hover:-translate-y-1"
              >
                <div className="text-4xl mb-4 p-3 rounded-2xl bg-cyan-100 inline-block">{dept.icon}</div>
                <h3 className="font-extrabold text-lg text-slate-900 mb-2">{dept.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{dept.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* D. Leadership Section */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Hospital Leadership & Directors</h2>
            <p className="text-slate-200 text-sm sm:text-base">
              Guiding our clinical mission with decades of medical expertise and governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {leadership.map((leader) => (
              <div
                key={leader.name}
                className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 text-slate-900 shadow-2xl flex flex-col sm:flex-row gap-6 items-center"
              >
                <img
                  src={leader.photo}
                  alt={leader.name}
                  className="w-32 h-32 rounded-2xl object-cover shrink-0 shadow-md border-2 border-cyan-500/20"
                />
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900 mb-1">{leader.name}</h3>
                  <p className="text-cyan-600 text-xs font-extrabold uppercase tracking-wider mb-3">{leader.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{leader.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* E. History Section */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Our History & Milestones</h2>
            <p className="text-slate-200 text-sm sm:text-base">
              Decades of commitment to community health, medical innovation, and patient care.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {historyMilestones.map((item) => (
              <div
                key={item.year}
                className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 text-slate-900 shadow-2xl relative overflow-hidden"
              >
                <div className="text-3xl font-black text-cyan-600 mb-2">{item.year}</div>
                <h3 className="font-extrabold text-base text-slate-900 mb-1.5">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* F. Patient Information & Facilities Section */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Patient Information & Facilities</h2>
            <p className="text-slate-200 text-sm sm:text-base">
              Essential visit guidelines for patients and visitors at {HOSPITAL_CONFIG.hospitalName}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 text-slate-900 shadow-2xl">
              <div className="text-3xl mb-3">🕒</div>
              <h3 className="font-extrabold text-base text-slate-900 mb-2">Visiting Hours</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                General Wards: 4:00 PM – 7:00 PM daily.<br />
                ICU / Critical Care: 11:00 AM – 12:00 PM & 5:00 PM – 6:00 PM.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 text-slate-900 shadow-2xl">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-extrabold text-base text-slate-900 mb-2">Patient Registration</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                New patients should arrive 15 minutes prior to appointment with a valid ID and medical records.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/50 text-slate-900 shadow-2xl">
              <div className="text-3xl mb-3">🚑</div>
              <h3 className="font-extrabold text-base text-slate-900 mb-2">Emergency Services</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                24/7 Trauma and Emergency department equipped with advanced life support and triage support.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Shared Footer — Matching LoginScreen */}
      <footer className="relative z-20 max-w-7xl mx-auto w-full pt-8 border-t border-white/15 text-center text-xs text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>© {new Date().getFullYear()} {HOSPITAL_CONFIG.hospitalName}. All rights reserved. Powered by {HOSPITAL_CONFIG.softwarePlatform}.</div>
        <div className="flex items-center gap-4">
          <span>{HOSPITAL_CONFIG.accreditation}</span>
          <span>•</span>
          <span>Emergency: {HOSPITAL_CONFIG.emergencyPhone}</span>
        </div>
      </footer>
    </div>
  );
}

function AskRoseWidget({ darkMode }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { sender: "rose", text: "Hello! I am Rose, your 24/7 AI Clinical Assistant at MediCare Pro. How can I help you with your health, appointments, or department guidance today?" }
  ]);
  const [loading, setLoading] = useState(false);

  const handleAsk = (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const userMsg = question.trim();
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setQuestion("");
    setLoading(true);

    setTimeout(() => {
      let reply = "I recommend booking a consultation with our specialist physicians through the MediCare Pro Dashboard, or visiting our Emergency Department for urgent care.";
      const q = userMsg.toLowerCase();
      if (q.includes("chest") || q.includes("heart") || q.includes("cardiac")) {
        reply = "For chest pain or cardiac concerns, please visit our Emergency Department immediately or consult our Cardiology department (Dr. Robert Vance).";
      } else if (q.includes("appointment") || q.includes("book")) {
        reply = "You can book an appointment easily by logging into the MediCare Pro Dashboard and selecting your preferred doctor and time slot.";
      } else if (q.includes("lab") || q.includes("report") || q.includes("xray")) {
        reply = "Lab reports and diagnostic images are available securely in your patient portal under the Laboratory and Invoices sections.";
      } else if (q.includes("doctor") || q.includes("specialist")) {
        reply = "We have top specialist physicians across Cardiology, Neurology, Orthopedics, Pediatrics, and General Medicine. Check out 'Our Specialist Physicians' below!";
      }
      setMessages(prev => [...prev, { sender: "rose", text: reply }]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white/95 backdrop-blur-xl border border-cyan-400/40 text-slate-900 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
          🌹
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Ask Rose AI</h3>
          <p className="text-xs text-cyan-600 font-bold">MediCare Pro AI Clinical Assistant • 24/7 Active</p>
        </div>
      </div>

      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed font-medium ${
              m.sender === "user"
                ? "bg-cyan-600 text-white rounded-br-none shadow-sm"
                : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl text-xs bg-slate-100 text-slate-500 font-medium border border-slate-200">
              Rose is typing...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Rose a health or hospital question..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
        />
        <button
          type="submit"
          className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all shrink-0 flex items-center gap-1.5"
        >
          <Send size={14} />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
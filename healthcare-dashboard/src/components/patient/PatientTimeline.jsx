// src/components/patient/PatientTimeline.jsx

const TIMELINE_ICONS = {
  Registration:  { icon: "🏥", color: "bg-cyan-500",   ring: "ring-cyan-300" },
  Consultation:  { icon: "👨‍⚕️", color: "bg-blue-500",   ring: "ring-blue-300" },
  "Lab Test":    { icon: "🔬", color: "bg-yellow-500", ring: "ring-yellow-300" },
  Prescription:  { icon: "💊", color: "bg-green-500",  ring: "ring-green-300" },
  Billing:       { icon: "💳", color: "bg-purple-500", ring: "ring-purple-300" },
  Discharge:     { icon: "🚪", color: "bg-gray-500",   ring: "ring-gray-300" },
  "Follow-up":   { icon: "📅", color: "bg-indigo-500", ring: "ring-indigo-300" },
  "X-Ray":       { icon: "🩻", color: "bg-slate-500",  ring: "ring-slate-300" },
};

const getStyle = (type) => TIMELINE_ICONS[type] || { icon: "📋", color: "bg-slate-400", ring: "ring-slate-200" };

const PENDING_STEPS = [
  { type: "Registration",  label: "Patient Registered" },
  { type: "Consultation",  label: "Doctor Consultation" },
  { type: "Lab Test",      label: "Laboratory Test" },
  { type: "Prescription",  label: "Prescription Issued" },
  { type: "Billing",       label: "Billing" },
  { type: "Discharge",     label: "Discharge" },
  { type: "Follow-up",     label: "Follow-up Scheduled" },
];

export default function PatientTimeline({
  timeline = [],
  onAddEvent,
  timelineForm,
  setTimelineForm,
  darkMode,
}) {
  const inputClass = `border p-2.5 rounded-lg text-sm w-full ${
    darkMode
      ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;

  const hasEvents = timeline.length > 0;

  return (
    <div>
      {/* Timeline track */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className={`absolute left-[19px] top-2 bottom-0 w-0.5 ${
            darkMode ? "bg-slate-700" : "bg-slate-200"
          }`}
        />

        <div className="space-y-4">
          {hasEvents
            ? timeline.map((event, idx) => {
                const style = getStyle(event.type);
                const isLast = idx === timeline.length - 1;
                return (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Icon bubble */}
                    <div
                      className={`relative z-10 w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-base shadow-md ring-4 ring-white dark:ring-slate-900 ${style.color} ${style.ring}`}
                    >
                      {style.icon}
                    </div>

                    {/* Card */}
                    <div
                      className={`flex-1 mb-1 p-4 rounded-xl border transition-shadow hover:shadow-md ${
                        darkMode
                          ? "bg-slate-800 border-slate-700"
                          : "bg-white border-slate-200 shadow-sm"
                      } ${isLast ? "border-cyan-400/40" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold text-sm leading-tight">{event.title}</p>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                              darkMode
                                ? "bg-slate-700 text-slate-300"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {event.type}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-mono flex-shrink-0 ${
                            darkMode ? "text-slate-400" : "text-slate-400"
                          }`}
                        >
                          {event.date}
                        </span>
                      </div>
                      {event.details && (
                        <p
                          className={`mt-2 text-sm leading-relaxed ${
                            darkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {event.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            : /* Pending placeholder steps */
              PENDING_STEPS.map((step) => {
                const style = getStyle(step.type);
                return (
                  <div key={step.type} className="relative flex gap-4 opacity-40">
                    <div
                      className={`relative z-10 w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-base border-2 border-dashed ${
                        darkMode
                          ? "border-slate-600 bg-slate-800"
                          : "border-slate-300 bg-slate-50"
                      }`}
                    >
                      {style.icon}
                    </div>
                    <div
                      className={`flex-1 p-3 rounded-xl border-2 border-dashed ${
                        darkMode ? "border-slate-700" : "border-slate-200"
                      }`}
                    >
                      <p className="text-xs font-medium text-slate-500">
                        {step.label}{" "}
                        <span className="opacity-60">(Pending)</span>
                      </p>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Add Event Form */}
      {onAddEvent && timelineForm && setTimelineForm && (
        <div
          className={`mt-8 p-5 rounded-2xl border ${
            darkMode
              ? "bg-slate-800 border-slate-700"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <p className="font-semibold text-sm mb-4 flex items-center gap-2">
            <span>➕</span> Add Timeline Event
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className={inputClass}
              value={timelineForm.type}
              onChange={(e) => setTimelineForm({ ...timelineForm, type: e.target.value })}
            >
              <option>Consultation</option>
              <option>Prescription</option>
              <option>Lab Test</option>
              <option>X-Ray</option>
              <option>Billing</option>
              <option>Follow-up</option>
              <option>Discharge</option>
            </select>
            <input
              className={inputClass}
              placeholder="Event title"
              value={timelineForm.title}
              onChange={(e) => setTimelineForm({ ...timelineForm, title: e.target.value })}
            />
            <input
              className={inputClass}
              placeholder="Details / notes"
              value={timelineForm.details}
              onChange={(e) => setTimelineForm({ ...timelineForm, details: e.target.value })}
            />
          </div>
          <button
            onClick={onAddEvent}
            className="mt-3 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Add Event
          </button>
        </div>
      )}
    </div>
  );
}
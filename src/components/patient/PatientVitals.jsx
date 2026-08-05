// src/components/patient/PatientVitals.jsx

const calculateBMI = (height, weight) => {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || !w || h <= 0) return null;
  return (w / ((h / 100) * (h / 100))).toFixed(1);
};

const getBMICategory = (bmi) => {
  if (!bmi) return "";
  const b = parseFloat(bmi);
  if (b < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (b < 25)   return { label: "Normal",       color: "text-green-600" };
  if (b < 30)   return { label: "Overweight",   color: "text-orange-500" };
  return           { label: "Obese",          color: "text-red-600" };
};

const getStatusColor = (value, normal) => {
  if (!value) return { dot: "bg-slate-300", text: "text-slate-400" };
  return { dot: "bg-green-500", text: "text-green-600" };
};

export default function PatientVitals({ patient, darkMode }) {
  const bmi = calculateBMI(patient.height, patient.weight);
  const bmiCat = getBMICategory(bmi);

  const vitals = [
    {
      label: "Blood Pressure",
      value: patient.bloodPressure || null,
      unit: "mmHg",
      normal: "90/60 – 120/80",
      icon: "🩺",
      accent: "from-red-500 to-rose-600",
      iconBg: "bg-red-50",
      iconText: "text-red-500",
    },
    {
      label: "Heart Rate",
      value: patient.pulse || null,
      unit: "bpm",
      normal: "60 – 100 bpm",
      icon: "❤️",
      accent: "from-pink-500 to-rose-500",
      iconBg: "bg-pink-50",
      iconText: "text-pink-500",
    },
    {
      label: "Temperature",
      value: patient.temperature || null,
      unit: "°F",
      normal: "97.8 – 99.1 °F",
      icon: "🌡️",
      accent: "from-orange-500 to-amber-500",
      iconBg: "bg-orange-50",
      iconText: "text-orange-500",
    },
    {
      label: "O₂ Saturation",
      value: patient.oxygenSaturation || null,
      unit: "%",
      normal: "95 – 100%",
      icon: "💧",
      accent: "from-blue-500 to-cyan-500",
      iconBg: "bg-blue-50",
      iconText: "text-blue-500",
    },
    {
      label: "Respiratory Rate",
      value: patient.respiratoryRate || null,
      unit: "/min",
      normal: "12 – 20 /min",
      icon: "🫁",
      accent: "from-teal-500 to-cyan-600",
      iconBg: "bg-teal-50",
      iconText: "text-teal-500",
    },
    {
      label: "Height",
      value: patient.height || null,
      unit: "cm",
      normal: "—",
      icon: "📏",
      accent: "from-slate-500 to-slate-600",
      iconBg: "bg-slate-100",
      iconText: "text-slate-500",
    },
    {
      label: "Weight",
      value: patient.weight || null,
      unit: "kg",
      normal: "—",
      icon: "⚖️",
      accent: "from-indigo-500 to-violet-600",
      iconBg: "bg-indigo-50",
      iconText: "text-indigo-500",
    },
  ];

  const cardBase = darkMode
    ? "bg-slate-800 border-slate-700"
    : "bg-white border-slate-200 shadow-sm";

  return (
    <div>
      {/* Vitals grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {vitals.map(({ label, value, unit, normal, icon, iconBg, iconText }) => {
          const hasValue = !!value;
          return (
            <div
              key={label}
              className={`relative overflow-hidden rounded-2xl border p-4 transition-shadow hover:shadow-md ${cardBase}`}
            >
              {/* Icon badge */}
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 text-xl ${
                  darkMode ? "bg-slate-700" : iconBg
                }`}
              >
                {icon}
              </div>

              {/* Value */}
              <div className={`text-xl font-bold leading-tight ${hasValue ? "" : "text-slate-400"}`}>
                {hasValue ? (
                  <>
                    {value}
                    <span className={`text-xs font-normal ml-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {unit}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-normal text-slate-400">Not Recorded</span>
                )}
              </div>

              <div className={`text-xs font-medium mt-0.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                {label}
              </div>

              {/* Normal range */}
              {normal !== "—" && (
                <div className={`mt-2 text-[10px] leading-tight ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                  Normal: {normal}
                </div>
              )}

              {/* Status dot */}
              <div className="absolute top-3 right-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    hasValue ? "bg-green-500" : "bg-slate-300"
                  }`}
                />
              </div>
            </div>
          );
        })}

        {/* BMI card — computed */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-4 transition-shadow hover:shadow-md ${
            bmi
              ? darkMode
                ? "bg-cyan-950 border-cyan-800"
                : "bg-cyan-50 border-cyan-200 shadow-sm"
              : cardBase
          }`}
        >
          <div
            className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 text-xl ${
              darkMode ? "bg-cyan-900" : "bg-cyan-100"
            }`}
          >
            📊
          </div>
          <div className={`text-xl font-bold leading-tight ${bmi ? "text-cyan-600" : "text-slate-400"}`}>
            {bmi ?? <span className="text-sm font-normal text-slate-400">Not Recorded</span>}
          </div>
          <div className={`text-xs font-medium mt-0.5 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
            BMI (Auto-calc)
          </div>
          {bmi && (
            <div className={`mt-1.5 text-xs font-semibold ${bmiCat.color}`}>
              {bmiCat.label}
            </div>
          )}
          <div className="absolute top-3 right-3">
            <div className={`w-2 h-2 rounded-full ${bmi ? "bg-cyan-500" : "bg-slate-300"}`} />
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div
        className={`rounded-xl p-4 border flex flex-wrap gap-4 text-sm ${
          darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
        }`}
      >
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Recorded On
          </span>
          <p className="font-medium">{patient.registeredDate || "—"}</p>
        </div>
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Blood Group
          </span>
          <p className="font-bold text-cyan-600">{patient.bloodGroup || "—"}</p>
        </div>
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Disability
          </span>
          <p className="font-medium">{patient.disability || "None"}</p>
        </div>
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Pregnancy Status
          </span>
          <p className="font-medium">{patient.pregnancyStatus || "N/A"}</p>
        </div>
      </div>
    </div>
  );
}
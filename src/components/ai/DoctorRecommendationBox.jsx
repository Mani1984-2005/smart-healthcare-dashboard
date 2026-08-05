// src/components/ai/DoctorRecommendationBox.jsx
import { useMemo } from "react";
import { recommendDoctor } from "../../utils/aiEngine";

export default function DoctorRecommendationBox({ patient, staffList = [], darkMode }) {
  const rec = useMemo(() => recommendDoctor(patient || {}, staffList), [patient, staffList]);

  const bg = darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900";

  return (
    <div className={`${bg} rounded-2xl p-5 shadow`}>
      <h3 className="text-lg font-bold mb-3">Doctor Recommendation</h3>
      <div className="text-sm space-y-2">
        <div><span className="font-semibold">Target Specialty:</span> {rec.specialty}</div>
        <div><span className="font-semibold">Reason:</span> {rec.reason}</div>
        <div>
          <span className="font-semibold">Assigned Doctor:</span>{" "}
          {rec.doctor ? rec.doctor.name : "Not available"}
        </div>
        {rec.doctor && (
          <div className="text-slate-500">
            {rec.doctor.department?.name || rec.doctor.specialization || "General Doctor"}
          </div>
        )}
      </div>
    </div>
  );
}
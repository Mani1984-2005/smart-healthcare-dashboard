import { useState, useEffect, useMemo } from "react";
import { DOCTORS } from "../data/doctors";
import { generateToken } from "../utils/tokenGenerator";
import { getSymptomSuggestion } from "../utils/symptomSuggestion";
import LiveClock from "../components/LiveClock";
import AnnouncementsPanel from "../components/AnnouncementsPanel";
import { StatusBadge, ActionButton, SearchInput, DataTable } from "../components/ui";
import KPICard from "../components/dashboard/KPICard";
import Widget from "../components/dashboard/Widget";
import CriticalAlerts from "../components/dashboard/CriticalAlerts";
import SystemHealthPanel from "../components/dashboard/SystemHealthPanel";
import { SkeletonKPI, SkeletonWidget, SkeletonTable } from "../components/dashboard/SkeletonLoader";

const emptyForm = { patient: "", age: "", phone: "", symptoms: "", date: "", time: "" };

const activityFeed = [
  { id: 1, user: "Dr. Arjun Raza", action: "completed a consultation", target: "Patient Ravi", time: "2 min ago", type: "consultation" },
  { id: 2, user: "Nurse Priya", action: "admitted", target: "Patient Sunita", time: "8 min ago", type: "admission" },
  { id: 3, user: "Lab Report", action: "results available for", target: "Patient Aman", time: "15 min ago", type: "lab" },
  { id: 4, user: "Reception", action: "booked appointment for", target: "Dr. Sharma", time: "22 min ago", type: "appointment" },
  { id: 5, user: "Pharmacy", action: "dispensed medicine to", target: "Patient Neha", time: "35 min ago", type: "pharmacy" },
  { id: 6, user: "Dr. Vikram", action: "requested MRI for", target: "Patient Meera", time: "1h ago", type: "lab" },
];

function HealthScore({ value, label }) {
  const color = value >= 90 ? "text-emerald-600" : value >= 70 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200/70 px-5 py-3 shadow-sm">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={${value}, 100} strokeLinecap="round" className={color} />
        </svg>
        <span className={bsolute inset-0 flex items-center justify-center text-sm font-bold }>{value}%</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-400">All systems normal</p>
      </div>
    </div>
  );
}

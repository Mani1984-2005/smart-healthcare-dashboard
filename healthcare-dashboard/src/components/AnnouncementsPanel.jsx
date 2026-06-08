// src/components/AnnouncementsPanel.jsx
import { useState } from "react";
import { ANNOUNCEMENTS } from "../data/announcements";

export default function AnnouncementsPanel({ darkMode }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const tagColors = {
    red:    darkMode ? "bg-red-950 text-red-300"     : "bg-red-100 text-red-700",
    green:  darkMode ? "bg-green-950 text-green-300" : "bg-green-100 text-green-700",
    yellow: darkMode ? "bg-yellow-950 text-yellow-300" : "bg-yellow-100 text-yellow-700",
    cyan:   darkMode ? "bg-cyan-950 text-cyan-300"   : "bg-cyan-100 text-cyan-700",
  };

  const borderColors = {
    red: "border-red-500", green: "border-green-500",
    yellow: "border-yellow-500", cyan: "border-cyan-500",
  };

  return (
    <div className={`rounded-2xl border shadow-xl overflow-hidden ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
      <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800 bg-slate-800/60" : "border-slate-100 bg-slate-50"}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📢</span>
          <h2 className={`font-black text-lg ${darkMode ? "text-white" : "text-slate-900"}`}>Hospital Announcements</h2>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${darkMode ? "bg-cyan-950 text-cyan-300" : "bg-cyan-100 text-cyan-700"}`}>
          {ANNOUNCEMENTS.length} Active
        </span>
      </div>

      <div className="flex gap-1 p-3 border-b overflow-x-auto scrollbar-none" style={{ borderColor: darkMode ? "#1e293b" : "#f1f5f9" }}>
        {ANNOUNCEMENTS.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setActiveIdx(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeIdx === i
                ? tagColors[a.color] + " shadow"
                : darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <span>{a.icon}</span>
            {a.title}
          </button>
        ))}
      </div>

      <div className="p-5">
        {ANNOUNCEMENTS.map((a, i) =>
          i === activeIdx ? (
            <div key={a.id} className={`rounded-xl border-l-4 p-4 ${borderColors[a.color]} ${darkMode ? "bg-slate-800/50" : "bg-slate-50"}`}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{a.icon}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`font-black text-base ${darkMode ? "text-white" : "text-slate-900"}`}>{a.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${tagColors[a.color]}`}>{a.tag}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{a.desc}</p>
                </div>
              </div>
            </div>
          ) : null
        )}
        <div className="flex justify-center gap-1.5 mt-4">
          {ANNOUNCEMENTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`rounded-full transition-all ${activeIdx === i ? "w-5 h-2 bg-cyan-500" : "w-2 h-2 " + (darkMode ? "bg-slate-700" : "bg-slate-300")}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
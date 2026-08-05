import { useEffect, useState } from "react";

function useLiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return now;
}

export default function LiveClock({ darkMode }) {
  const now = useLiveClock();

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayName = days[now.getDay()];
  const date = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  const hour12 = now.getHours() % 12 || 12;

  return (
    <div className={`rounded-2xl border px-5 py-4 flex flex-col items-end justify-center min-w-[180px] shadow-lg ${darkMode ? "bg-slate-800/80 border-slate-700 text-white" : "bg-white/80 border-slate-200 text-slate-900"}`}>
      <div className="text-3xl font-black tabular-nums tracking-tight text-cyan-400">
        {String(hour12).padStart(2, "0")}:{minutes}:{seconds}
        <span className="text-base font-semibold ml-1 text-cyan-300">{ampm}</span>
      </div>
      <div className={`text-xs mt-1 font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
        {dayName}, {date} {month} {year}
      </div>
    </div>
  );
}

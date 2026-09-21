import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, ArrowUpRight, BrainCircuit, CalendarDays, Clock3, FileClock, FlaskConical, IndianRupee, Pill, Plus, Stethoscope, UserRoundCheck, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";
import { Badge, Button, MetricCard, PageHeader, Section } from "../components/ui";

const patientGrowth = [
  { month: "Mar", patients: 1080 }, { month: "Apr", patients: 1135 }, { month: "May", patients: 1188 },
  { month: "Jun", patients: 1214 }, { month: "Jul", patients: 1256 }, { month: "Aug", patients: 1283 },
];
const appointmentTrends = [
  { day: "Mon", completed: 48, scheduled: 56 }, { day: "Tue", completed: 52, scheduled: 60 }, { day: "Wed", completed: 44, scheduled: 51 },
  { day: "Thu", completed: 58, scheduled: 63 }, { day: "Fri", completed: 49, scheduled: 57 }, { day: "Sat", completed: 31, scheduled: 36 },
];
const revenueTrend = [
  { month: "Mar", revenue: 8.4 }, { month: "Apr", revenue: 9.1 }, { month: "May", revenue: 8.8 },
  { month: "Jun", revenue: 10.2 }, { month: "Jul", revenue: 10.8 }, { month: "Aug", revenue: 11.6 },
];
const schedule = [
  { time: "09:00", patient: "Amrita Singh", clinician: "Dr. Kavya Shah", type: "Follow-up", status: "Checked in" },
  { time: "10:30", patient: "Rahul Mehra", clinician: "Dr. Anil Kumar", type: "Consultation", status: "Scheduled" },
  { time: "11:15", patient: "Priya Desai", clinician: "Dr. Kavya Shah", type: "Lab review", status: "Scheduled" },
];
const doctors = [
  { name: "Dr. Kavya Shah", speciality: "Cardiology", status: "Available" },
  { name: "Dr. Anil Kumar", speciality: "Internal medicine", status: "With patient" },
  { name: "Dr. Meera Iyer", speciality: "Pediatrics", status: "Available" },
];
const labQueue = ["CBC panel — 08 samples awaiting review", "Thyroid panel — result verification", "Lipid profile — collection pending"];
const pharmacyAlerts = ["Amoxicillin 500mg: 18 units remaining", "Insulin pen: reorder threshold reached"];

function chartTooltip(value: number | string) {
  return typeof value === "number" ? value.toLocaleString("en-IN") : value;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const dateContext = useMemo(() => new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()), []);
  const greeting = user?.name ? `Good day, ${user.name}` : "Good day";

  const metrics = [
    { label: "Total patients", value: "1,283", description: "Registered patient base", trend: "+4.2% this month", icon: <UsersRound className="h-5 w-5" aria-hidden="true" /> },
    { label: "Today's appointments", value: "56", description: "48 confirmed", trend: "8 awaiting check-in", icon: <CalendarDays className="h-5 w-5" aria-hidden="true" /> },
    { label: "Active doctors", value: "42", description: "Across 12 specialties", trend: "3 currently available", icon: <Stethoscope className="h-5 w-5" aria-hidden="true" /> },
    { label: "Revenue", value: "₹11.6L", description: "Month to date", trend: "+7.4% vs. July", icon: <IndianRupee className="h-5 w-5" aria-hidden="true" /> },
    { label: "Pending reports", value: "14", description: "Laboratory and imaging", trend: "5 due within 2 hours", icon: <FileClock className="h-5 w-5" aria-hidden="true" /> },
  ];

  return <div className="space-y-6">
    <PageHeader eyebrow={dateContext} title={greeting} description="Monitor care delivery, clinical capacity, and the priorities requiring action today." actions={<><Button variant="secondary" onClick={() => navigate("/appointments")}><CalendarDays className="h-4 w-4" aria-hidden="true" />View schedule</Button><Button onClick={() => navigate("/patients")}><Plus className="h-4 w-4" aria-hidden="true" />Add patient</Button></>} />

    <section aria-label="Healthcare key performance indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => <MetricCard key={metric.label} {...metric} trend={<><ArrowUpRight className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{metric.trend}</>} />)}
    </section>

    <section className="grid gap-6 xl:grid-cols-2">
      <Section title="Patient growth" description="Registered patients over the last six months" action={<Badge variant="success">Healthy growth</Badge>}>
        <div className="h-72" aria-label="Patient growth chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={patientGrowth} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="patientGrowthGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0b6e99" stopOpacity={0.25} /><stop offset="95%" stopColor="#0b6e99" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e2e8f0" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip formatter={chartTooltip} /><Area type="monotone" dataKey="patients" stroke="#0b6e99" strokeWidth={2.5} fill="url(#patientGrowthGradient)" /></AreaChart></ResponsiveContainer></div>
      </Section>
      <Section title="Appointment flow" description="Scheduled and completed appointments this week" action={<Badge variant="info">This week</Badge>}>
        <div className="h-72" aria-label="Appointment trends chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={appointmentTrends} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8f0" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip formatter={chartTooltip} /><Legend iconType="circle" iconSize={8} /><Bar dataKey="scheduled" name="Scheduled" fill="#93c5fd" radius={[4, 4, 0, 0]} /><Bar dataKey="completed" name="Completed" fill="#0b6e99" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Section>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      <Section title="Revenue performance" description="Monthly collections in lakhs" action={<Badge variant="success">+7.4%</Badge>}>
        <div className="h-64" aria-label="Revenue trend chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={revenueTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e2e8f0" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip formatter={(value) => `₹${chartTooltip(value)}L`} /><Line type="monotone" dataKey="revenue" stroke="#16803c" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
      </Section>
      <Section title="MediCare AI Insights" description="Future-ready clinical operations intelligence.">
        <div className="flex h-64 flex-col justify-between rounded-lg bg-cyan-50 p-5 dark:bg-cyan-950/30"><div><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-card dark:bg-slate-900"><BrainCircuit className="h-5 w-5" aria-hidden="true" /></div><p className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Insight workspace ready</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Care-demand forecasting, operational recommendations, and clinical trend summaries will appear here when enabled.</p></div><Badge variant="neutral">No insights generated</Badge></div>
      </Section>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
      <Section title="Today's schedule" description="Next priority appointments" action={<Button variant="ghost" onClick={() => navigate("/appointments")}>Open appointments</Button>}>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{schedule.map((item) => <div key={`${item.time}-${item.patient}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="flex w-16 items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><Clock3 className="h-4 w-4 text-cyan-700" aria-hidden="true" />{item.time}</div><div className="flex-1"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.patient}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.type} with {item.clinician}</p></div><Badge variant={item.status === "Checked in" ? "success" : "neutral"}>{item.status}</Badge></div>)}</div>
      </Section>
      <Section title="Doctor availability" description="Live care-team capacity" action={<Button variant="ghost" onClick={() => navigate("/doctors")}>View directory</Button>}>
        <div className="space-y-4">{doctors.map((doctor) => <div key={doctor.name} className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><UserRoundCheck className="h-4 w-4" aria-hidden="true" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{doctor.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{doctor.speciality}</p></div><Badge variant={doctor.status === "Available" ? "success" : "warning"}>{doctor.status}</Badge></div>)}</div>
      </Section>
    </section>

    <section className="grid gap-6 lg:grid-cols-2">
      <Section title="Laboratory queue" description="Items requiring review" action={<FlaskConical className="h-5 w-5 text-cyan-700" aria-hidden="true" />}><ul className="space-y-3">{labQueue.map((item) => <li key={item} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200"><Activity className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" aria-hidden="true" />{item}</li>)}</ul></Section>
      <Section title="Pharmacy alerts" description="Inventory conditions to monitor" action={<Pill className="h-5 w-5 text-amber-700" aria-hidden="true" />}><ul className="space-y-3">{pharmacyAlerts.map((item) => <li key={item} className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{item}</li>)}</ul></Section>
    </section>

    <Section title="Critical attention" description="High-priority events that require an owner or immediate review." className="border-rose-200 dark:border-rose-900/60" action={<Badge variant="critical">2 active alerts</Badge>}>
      <div className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-rose-900 dark:text-rose-100">Critical patient observation</p><p className="mt-1 text-sm text-rose-800 dark:text-rose-200">P-1004 requires a cardiac care-team review.</p></div><Badge variant="critical">Critical</Badge></div><Button variant="danger" className="mt-4" onClick={() => navigate("/patients/P-1004")}>Review patient</Button></div><div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Laboratory turnaround risk</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Five reports are approaching their clinical review target.</p></div><Badge variant="warning">Priority</Badge></div><Button variant="secondary" className="mt-4" onClick={() => navigate("/laboratory")}>Open laboratory</Button></div></div>
    </Section>
  </div>;
}

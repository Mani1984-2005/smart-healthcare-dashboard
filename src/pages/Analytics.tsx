import { useMemo, useState } from "react";
import { AlertTriangle, Clock3, CalendarCheck2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyticsSummary, operationalMetrics } from "../demo/prototypeData";
import { Badge, Button, MetricCard, PageHeader, Section } from "../components/ui";

type RangeKey = "7d" | "3d" | "today";

function chartTooltip(value: number | string) {
  return typeof value === "number" ? value.toLocaleString("en-IN") : value;
}

export default function Analytics() {
  const [range, setRange] = useState<RangeKey>("7d");

  const sliceCount = range === "today" ? 1 : range === "3d" ? 3 : 7;

  const appointmentDaily = useMemo(
    () => analyticsSummary.appointments.daily.slice(-sliceCount),
    [sliceCount]
  );
  const volumes = useMemo(() => analyticsSummary.dailyVolumes.slice(-sliceCount), [sliceCount]);

  const completionInRange = useMemo(() => {
    const scheduled = appointmentDaily.reduce((s, d) => s + d.scheduled, 0);
    const completed = appointmentDaily.reduce((s, d) => s + d.completed, 0);
    return scheduled ? Math.round((completed / scheduled) * 100) : 0;
  }, [appointmentDaily]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations intelligence"
        title="Analytics"
        description="Queue wait trends, appointment completion, and daily care volumes."
        actions={
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["7d", "Last 7 days"],
                ["3d", "Last 3 days"],
                ["today", "Today"],
              ] as [RangeKey, string][]
            ).map(([key, label]) => (
              <Button key={key} variant={range === key ? "primary" : "secondary"} onClick={() => setRange(key)}>
                {label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Part 5 analytics API not present — prototype charts from demo data. Date filters apply client-side only.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Avg queue wait"
          value={`${analyticsSummary.queueWait.averageMinutes} min`}
          description={`P95 ${analyticsSummary.queueWait.p95Minutes} min`}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Completion rate"
          value={`${completionInRange}%`}
          description={`Selected range · baseline ${analyticsSummary.appointments.completionRate}%`}
          icon={<CalendarCheck2 className="h-5 w-5" />}
          trend={`No-show ${analyticsSummary.appointments.noShowRate}%`}
        />
        <MetricCard label="Active encounters" value={operationalMetrics.activeEncounters} description="Open clinical notes" />
        <MetricCard label="Bed occupancy" value={`${operationalMetrics.bedOccupancyPercent}%`} description={`${operationalMetrics.staffOnDuty} staff on duty`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Section title="Queue wait by hour" description="Average wait minutes and patient volume" action={<Badge variant="info">Today pattern</Badge>}>
          <div className="h-72" aria-label="Queue wait chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsSummary.queueWait.byHour} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="queueWaitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0b6e99" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0b6e99" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={chartTooltip} />
                <Area type="monotone" dataKey="waitMinutes" name="Wait (min)" stroke="#0b6e99" strokeWidth={2.5} fill="url(#queueWaitGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Appointment outcomes" description="Scheduled vs completed in the selected range" action={<Badge variant="neutral">{range}</Badge>}>
          <div className="h-72" aria-label="Appointment analytics chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentDaily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={chartTooltip} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="scheduled" name="Scheduled" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#0b6e99" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </section>

      <Section title="Daily care volumes" description="Encounters, labs, prescriptions, and invoices" action={<Badge variant="success">Prototype</Badge>}>
        <div className="h-72" aria-label="Daily volumes chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumes} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip formatter={chartTooltip} />
              <Legend iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="encounters" name="Encounters" stroke="#0b6e99" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="labOrders" name="Lab orders" stroke="#2563b8" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="prescriptions" name="Prescriptions" stroke="#16803c" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="invoices" name="Invoices" stroke="#b54708" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}

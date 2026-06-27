// src/pages/ReportsPage.jsx 
// Enterprise Hospital Analytics Dashboard 
// Reads from: patients, doctors, staff, billing_invoices, lab_tests, pharmacy_medicines, 
appointments 
 
import { useEffect, useState, useCallback } from "react"; 
import { jsPDF } from "jspdf"; 
 
// ─── Helpers 
────────────────────────────────────────────────────────────
────── 
 
function fmt(n) { 
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, 
maximumFractionDigits: 2 }); 
} 
 
function pct(a, b) { 
  if (!b) return "0%"; 
  return ((a / b) * 100).toFixed(1) + "%"; 
} 
 
function fmtDate(str) { 
  if (!str) return "—"; 
  return new Date(str).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: 
"numeric" }); 
} 
 
function todayStr() { return new Date().toISOString().split("T")[0]; } 
function monthStr()  { return new Date().toISOString().slice(0, 7); } 
 
// ─── Mini Bar Chart (no library needed) 
────────────────────────────────────── 
 
function MiniBarChart({ data, color = "#3b82f6" }) { 
  if (!data || data.length === 0) return <div className="h-32 flex items-center justify-center 
text-xs text-slate-400">No data available</div>; 
  const max = Math.max(...data.map((d) => d.value), 1); 
  return ( 
    <div className="flex items-end gap-1 h-32 w-full"> 
      {data.map((d, i) => ( 
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0"> 
          <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(4, 
(d.value / max) * 96)}px`, backgroundColor: color }} title={`${d.label}: ${d.value}`} /> 
          <span className="text-[9px] text-slate-400 truncate w-full text-center">{d.label}</span> 
        </div> 
      ))} 
    </div> 
  ); 
} 
 
// ─── Stat Card 
────────────────────────────────────────────────────────────
──── 
 
function StatCard({ icon, label, value, sub, tone }) { 
  const tones = { 
    blue:   "bg-blue-50 text-blue-700", 
    green:  "bg-green-50 text-green-700", 
    purple: "bg-purple-50 text-purple-700", 
    yellow: "bg-yellow-50 text-yellow-700", 
    red:    "bg-red-50 text-red-700", 
    indigo: "bg-indigo-50 text-indigo-700", 
    teal:   "bg-teal-50 text-teal-700", 
    orange: "bg-orange-50 text-orange-700", 
    slate:  "bg-slate-50 text-slate-600", 
  }; 
  return ( 
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex 
items-start gap-3"> 
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 
${tones[tone] || tones.blue}`}>{icon}</div> 
      <div className="min-w-0"> 
        <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p> 
        <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p> 
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>} 
      </div> 
    </div> 
  ); 
} 
 
// ─── Section Header 
─────────────────────────────────────────────────────────── 
 
function SectionHeader({ icon, title, sub }) { 
  return ( 
    <div className="flex items-center gap-3 mb-4"> 
      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white 
text-base">{icon}</div> 
      <div> 
        <h2 className="text-base font-bold text-slate-800">{title}</h2> 
        {sub && <p className="text-xs text-slate-500">{sub}</p>} 
      </div> 
    </div> 
  ); 
} 
 
// ─── Progress Bar 
────────────────────────────────────────────────────────────
─ 
 
function ProgressBar({ label, value, max, color = "bg-blue-500" }) { 
  const ratio = max ? Math.min((value / max) * 100, 100) : 0; 
  return ( 
    <div className="mb-2"> 
      <div className="flex justify-between text-xs text-slate-500 mb-1"> 
        <span>{label}</span><span className="font-semibold">{value}</span> 
      </div> 
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden"> 
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${ratio}%` }} /> 
      </div> 
    </div> 
  ); 
} 
 
// ─── PDF Generator 
──────────────────────────────────────────────────────────── 
 
function generateReportPDF({ patients, doctors, staff, billing, labTests, medicines, appointments 
}) { 
  const doc = new jsPDF({ unit: "pt", format: "a4" }); 
  const pw = doc.internal.pageSize.getWidth(); 
  const ph = doc.internal.pageSize.getHeight(); 
  const now = new Date(); 
  const today = now.toISOString().split("T")[0]; 
  const month = today.slice(0, 7); 
 
  // Calculations 
  const todayBills = billing.filter((b) => b.billDate === today); 
  const monthBills = billing.filter((b) => (b.billDate || "").startsWith(month)); 
  const totalRev = billing.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0); 
  const monthRev = monthBills.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0); 
  const paidBills = billing.filter((b) => b.paymentStatus === "Paid").length; 
  const pendingAmt = billing.filter((b) => b.paymentStatus !== "Paid").reduce((s, b) => s + 
(parseFloat(b.dueAmount) || 0), 0); 
  const todayAppts = appointments.filter((a) => a.date === today).length; 
  const completedAppts = appointments.filter((a) => a.status === "Completed").length; 
  const lowStock = medicines.filter((m) => (parseInt(m.stock) || 0) < 10); 
 
  let y = 0; 
 
  // ── Cover / Header ── 
  doc.setFillColor(30, 64, 175); 
  doc.rect(0, 0, pw, 100, "F"); 
  doc.setTextColor(255, 255, 255); 
  doc.setFontSize(24); 
  doc.setFont("helvetica", "bold"); 
  doc.text("MediCare Pro", 40, 44); 
  doc.setFontSize(12); 
  doc.setFont("helvetica", "normal"); 
  doc.text("Enterprise Hospital Management Report", 40, 64); 
  doc.setFontSize(9); 
  doc.text(`Generated: ${now.toLocaleString("en-IN")}`, 40, 82); 
 
  // Page number helper 
  function addFooter(pageNum) { 
    doc.setFillColor(30, 64, 175); 
    doc.rect(0, ph - 30, pw, 30, "F"); 
    doc.setTextColor(255, 255, 255); 
    doc.setFontSize(8); 
    doc.text("MediCare Pro — Confidential Hospital Report", pw / 2, ph - 12, { align: "center" }); 
    doc.text(`Page ${pageNum}`, pw - 40, ph - 12, { align: "right" }); 
  } 
 
  // ── Section helper ── 
  function sectionTitle(title, yPos) { 
    doc.setFillColor(241, 245, 249); 
    doc.rect(30, yPos, pw - 60, 24, "F"); 
    doc.setFontSize(11); 
    doc.setFont("helvetica", "bold"); 
    doc.setTextColor(30, 64, 175); 
    doc.text(title, 40, yPos + 15); 
    return yPos + 34; 
  } 
 
  function row(label, value, yPos, shade) { 
    if (shade) { doc.setFillColor(248, 250, 252); doc.rect(30, yPos, pw - 60, 18, "F"); } 
    doc.setFont("helvetica", "normal"); 
    doc.setFontSize(9); 
    doc.setTextColor(80, 80, 80); 
    doc.text(label, 44, yPos + 12); 
    doc.setFont("helvetica", "bold"); 
    doc.setTextColor(30, 30, 30); 
    doc.text(String(value), pw - 44, yPos + 12, { align: "right" }); 
    return yPos + 18; 
  } 
 
  // ── Page 1 ── 
  y = 120; 
  y = sectionTitle("
🏥
  Hospital Overview", y); 
  y = row("Total Patients Registered", patients.length, y, true); 
  y = row("Total Doctors", doctors.length, y, false); 
  y = row("Total Staff", staff.length, y, true); 
  y = row("Total Appointments", appointments.length, y, false); 
  y = row("Appointments Today", todayAppts, y, true); 
  y = row("Completed Appointments", completedAppts, y, false); 
 
  y += 10; 
  y = sectionTitle("
💰
  Financial Summary", y); 
  y = row("Total Revenue (All Time)", fmt(totalRev), y, true); 
  y = row("Revenue This Month", fmt(monthRev), y, false); 
  y = row("Total Invoices", billing.length, y, true); 
  y = row("Paid Bills", paidBills, y, false); 
  y = row("Pending/Partial Bills", billing.length - paidBills, y, true); 
  y = row("Outstanding Balance", fmt(pendingAmt), y, false); 
  y = row("Average Bill Value", fmt(totalRev / (billing.length || 1)), y, true); 
 
  y += 10; 
  y = sectionTitle("
🔬
  Laboratory Summary", y); 
  y = row("Total Lab Tests Recorded", labTests.length, y, true); 
  const completedLab = labTests.filter((t) => t.status === "Completed" || t.status === 
"completed").length; 
  y = row("Completed Tests", completedLab, y, false); 
  y = row("Pending Tests", labTests.length - completedLab, y, true); 
 
  addFooter(1); 
 
  // ── Page 2 ── 
  doc.addPage(); 
  y = 40; 
  y = sectionTitle("
💊
  Pharmacy Summary", y); 
  y = row("Total Medicines in Inventory", medicines.length, y, true); 
  y = row("Low Stock Items (< 10 units)", lowStock.length, y, false); 
  const totalStock = medicines.reduce((s, m) => s + (parseInt(m.stock) || 0), 0); 
  y = row("Total Stock Units", totalStock, y, true); 
 
  y += 10; 
  y = sectionTitle("
󰞯
  Doctors Overview", y); 
  y = row("Total Doctors", doctors.length, y, true); 
  const depts = [...new Set(doctors.map((d) => d.department || d.specialization).filter(Boolean))]; 
  y = row("Departments Covered", depts.length, y, false); 
  y = row("Departments", depts.slice(0, 5).join(", ") || "—", y, true); 
 
  y += 10; 
  y = sectionTitle("
📅
  Appointment Statistics", y); 
  const apptStats = ["Pending", "Confirmed", "Completed", "Cancelled"].map((s) => ({ 
    label: s, count: appointments.filter((a) => a.status === s).length, 
  })); 
  apptStats.forEach((s, idx) => { y = row(s.label, s.count, y, idx % 2 === 0); }); 
 
  y += 10; 
  y = sectionTitle("
󰳋
  Patient Statistics", y); 
  y = row("Total Registered Patients", patients.length, y, true); 
  const withTimeline = patients.filter((p) => (p.timeline || []).length > 0).length; 
  y = row("Patients with Activity", withTimeline, y, false); 
 
  // Future structures 
  y += 20; 
  doc.setFontSize(9); 
  doc.setTextColor(150, 150, 150); 
  doc.setFont("helvetica", "italic"); 
  doc.text("Future Modules: Insurance Claims · Government Schemes · Audit Logs · Tax 
Reports · AI Financial Insights", 40, y); 
 
  addFooter(2); 
 
  doc.save(`MediCare_Report_${today}.pdf`); 
} 
 
// ─── Main Component 
─────────────────────────────────────────────────────────── 
 
export default function ReportsPage({ darkMode, appointments = [] }) { 
  const [patients,  setPatients]  = useState([]); 
  const [doctors,   setDoctors]   = useState([]); 
  const [staff,     setStaff]     = useState([]); 
  const [billing,   setBilling]   = useState([]); 
  const [labTests,  setLabTests]  = useState([]); 
  const [medicines, setMedicines] = useState([]); 
  const [activeTab, setActiveTab] = useState("overview"); 
 
  const today = todayStr(); 
  const month = monthStr(); 
 
  useEffect(() => { 
    setPatients(JSON.parse(localStorage.getItem("patients") || "[]")); 
    setDoctors(JSON.parse(localStorage.getItem("doctors") || "[]")); 
    setStaff(JSON.parse(localStorage.getItem("staff") || "[]")); 
    setBilling(JSON.parse(localStorage.getItem("billing_invoices") || "[]")); 
    setLabTests(JSON.parse(localStorage.getItem("lab_tests") || "[]")); 
    setMedicines(JSON.parse(localStorage.getItem("pharmacy_medicines") || "[]")); 
  }, []); 
 
  // ── Derived metrics ── 
  const todayBills       = billing.filter((b) => b.billDate === today); 
  const monthBills       = billing.filter((b) => (b.billDate || "").startsWith(month)); 
  const totalRev         = billing.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0); 
  const todayRev         = todayBills.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0); 
  const monthRev         = monthBills.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0); 
  const pendingAmt       = billing.filter((b) => b.paymentStatus !== "Paid").reduce((s, b) => s + 
(parseFloat(b.dueAmount) || 0), 0); 
  const paidBills        = billing.filter((b) => b.paymentStatus === "Paid"); 
  const pendingBills     = billing.filter((b) => b.paymentStatus === "Pending" || b.paymentStatus 
=== "Partial"); 
  const insuranceBills   = billing.filter((b) => b.paymentMethod === "Insurance"); 
  const todayAppts       = appointments.filter((a) => a.date === today); 
  const completedAppts   = appointments.filter((a) => a.status === "Completed"); 
  const cancelledAppts   = appointments.filter((a) => a.status === "Cancelled"); 
  const labCompleted     = labTests.filter((t) => t.status === "Completed" || t.status === 
"completed"); 
  const lowStock         = medicines.filter((m) => (parseInt(m.stock) || 0) < 10); 
  const avgBill          = billing.length ? totalRev / billing.length : 0; 
  const avgRevPerPatient = patients.length ? totalRev / patients.length : 0; 
 
  // ── Chart data: last 7 days revenue ── 
  const revTrend = [...Array(7)].map((_, i) => { 
    const d = new Date(); 
    d.setDate(d.getDate() - (6 - i)); 
    const key = d.toISOString().split("T")[0]; 
    const value = billing.filter((b) => b.billDate === key).reduce((s, b) => s + 
(parseFloat(b.grandTotal) || 0), 0); 
    return { label: d.toLocaleDateString("en-IN", { weekday: "short" }), value }; 
  }); 
 
  // ── Chart data: appointment status ── 
  const apptChart = ["Pending", "Confirmed", "Completed", "Cancelled"].map((s) => ({ 
    label: s.slice(0, 4), value: appointments.filter((a) => a.status === s).length, 
  })); 
 
  // ── Chart data: billing status ── 
  const billChart = ["Paid", "Pending", "Partial", "Refunded"].map((s) => ({ 
    label: s, value: billing.filter((b) => b.paymentStatus === s).length, 
  })); 
 
  // ── Chart data: lab tests per month (last 6) ── 
  const labChart = [...Array(6)].map((_, i) => { 
    const d = new Date(); 
    d.setMonth(d.getMonth() - (5 - i)); 
    const key = d.toISOString().slice(0, 7); 
    return { 
      label: d.toLocaleDateString("en-IN", { month: "short" }), 
      value: labTests.filter((t) => (t.date || t.createdAt || "").startsWith(key)).length, 
    }; 
  }); 
 
  // Departments 
  const depts = [...new Set(doctors.map((d) => d.department || d.specialization).filter(Boolean))]; 
 
  const tabs = [ 
    { key: "overview",   label: "
🏥
 Overview" }, 
    { key: "financial",  label: "
💰
 Financial" }, 
    { key: "clinical",   label: "
🩺
 Clinical" }, 
    { key: "laboratory", label: "
🔬
 Laboratory" }, 
    { key: "pharmacy",   label: "
💊
 Pharmacy" }, 
    { key: "doctors",    label: "
󰞯
 Doctors" }, 
    { key: "patients",   label: "
󰳋
 Patients" }, 
  ]; 
 
  const dark = darkMode; 
  const bg  = dark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"; 
  const cardBg = dark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"; 
 
  return ( 
    <div className={`min-h-screen p-4 md:p-6 lg:p-8 ${bg}`}> 
      <div className="max-w-screen-xl mx-auto"> 
 
        {/* Header */} 
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 
mb-6"> 
          <div> 
            <h1 className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-800"}`}>
📊
 
Analytics & Reports</h1> 
            <p className={`text-sm mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>Enterprise 
hospital performance dashboard.</p> 
          </div> 
          <button 
            onClick={() => generateReportPDF({ patients, doctors, staff, billing, labTests, medicines, 
appointments })} 
            className="h-9 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm 
font-semibold inline-flex items-center gap-2 shadow-sm transition-colors" 
          > 
            
�
�
 Export Report PDF 
          </button> 
        </div> 
 
        {/* Today's Quick Stats */} 
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"> 
          <StatCard icon="
󰳋
" label="Patients Today" value={todayAppts.length} tone="blue" /> 
          <StatCard icon="
💰
" label="Revenue Today" value={fmt(todayRev)} tone="green" /> 
          <StatCard icon="
🔬
" label="Lab Tests Total" value={labTests.length} tone="purple" /> 
          <StatCard icon="
💳
" label="Bills Today" value={todayBills.length} tone="indigo" /> 
        </div> 
 
        {/* Tabs */} 
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide"> 
          {tabs.map((t) => ( 
            <button key={t.key} onClick={() => setActiveTab(t.key)} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap 
transition-colors flex-shrink-0 ${ 
                activeTab === t.key 
                  ? "bg-blue-600 text-white" 
                  : dark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white border 
border-slate-200 text-slate-600 hover:bg-slate-50" 
              }`}> 
              {t.label} 
            </button> 
          ))} 
        </div> 
 
        {/* ── Overview Tab ── */} 
        {activeTab === "overview" && ( 
          <div className="space-y-6"> 
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"> 
              <StatCard icon="
󰳋
" label="Total Patients" value={patients.length} tone="blue" /> 
              <StatCard icon="
󰞯
" label="Total Doctors" value={doctors.length} tone="green" /> 
              <StatCard icon="
👥
" label="Total Staff" value={staff.length} tone="purple" /> 
              <StatCard icon="
📅
" label="Total Appointments" value={appointments.length} 
tone="indigo" /> 
              <StatCard icon="
✅
" label="Completed Appts" value={completedAppts.length} 
tone="teal" /> 
              <StatCard icon="
❌
" label="Cancelled Appts" value={cancelledAppts.length} 
tone="red" /> 
              <StatCard icon="
💳
" label="Total Invoices" value={billing.length} tone="orange" /> 
              <StatCard icon="
💰
" label="Total Revenue" value={fmt(totalRev)} tone="green" /> 
              <StatCard icon="
⏳
" label="Outstanding Balance" value={fmt(pendingAmt)} 
tone="yellow" /> 
              <StatCard icon="
🔬
" label="Lab Tests" value={labTests.length} tone="purple" /> 
              <StatCard icon="
💊
" label="Medicines" value={medicines.length} tone="teal" /> 
              <StatCard icon="
📈
" label="Avg Rev / Patient" value={fmt(avgRevPerPatient)} 
tone="indigo" /> 
            </div> 
 
            {/* Charts row */} 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
              <div className={`rounded-xl border p-5 ${cardBg}`}> 
                <h3 className="text-sm font-bold text-slate-700 mb-4">Revenue – Last 7 Days</h3> 
                <MiniBarChart data={revTrend} color="#3b82f6" /> 
              </div> 
              <div className={`rounded-xl border p-5 ${cardBg}`}> 
                <h3 className="text-sm font-bold text-slate-700 mb-4">Appointment Status 
Distribution</h3> 
                <MiniBarChart data={apptChart} color="#8b5cf6" /> 
              </div> 
            </div> 
          </div> 
        )} 
 
        {/* ── Financial Tab ── */} 
        {activeTab === "financial" && ( 
          <div className="space-y-6"> 
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"> 
              <StatCard icon="
💰
" label="Total Revenue" value={fmt(totalRev)} tone="green" /> 
              <StatCard icon="
📅
" label="Revenue Today" value={fmt(todayRev)} tone="blue" /> 
              <StatCard icon="
📈
" label="Revenue This Month" value={fmt(monthRev)} 
tone="indigo" /> 
              <StatCard icon="
⏳
" label="Pending Amount" value={fmt(pendingAmt)} tone="yellow" 
/> 
              <StatCard icon="
✅
" label="Paid Bills" value={paidBills.length} tone="teal" /> 
              <StatCard icon="
🔔
" label="Pending Bills" value={pendingBills.length} tone="orange" 
/> 
              <StatCard icon="
🏥
" label="Insurance Claims" value={insuranceBills.length} 
tone="purple" /> 
              <StatCard icon="
📊
" label="Average Bill" value={fmt(avgBill)} tone="slate" /> 
            </div> 
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
              <div className={`rounded-xl border p-5 ${cardBg}`}> 
                <h3 className="text-sm font-bold text-slate-700 mb-4">Revenue Trend (Last 7 
Days)</h3> 
                <MiniBarChart data={revTrend} color="#16a34a" /> 
              </div> 
              <div className={`rounded-xl border p-5 ${cardBg}`}> 
                <h3 className="text-sm font-bold text-slate-700 mb-4">Billing Status 
Breakdown</h3> 
                <MiniBarChart data={billChart} color="#2563eb" /> 
              </div> 
            </div> 
 
            {/* Payment method breakdown */} 
            <div className={`rounded-xl border p-5 ${cardBg}`}> 
              <h3 className="text-sm font-bold text-slate-700 mb-4">Payment Method 
Distribution</h3> 
              <div className="space-y-2"> 
                {["Cash", "UPI", "Card", "Insurance", "Mixed"].map((m) => { 
                  const count = billing.filter((b) => b.paymentMethod === m).length; 
                  return <ProgressBar key={m} label={m} value={count} max={billing.length} 
color="bg-blue-500" />; 
                })} 
              </div> 
            </div> 
 
            {/* Future modules note */} 
            <div className={`rounded-xl border border-dashed p-5 ${dark ? "border-slate-700 
bg-slate-900" : "border-slate-300 bg-slate-50"}`}> 
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider 
mb-2">Future Modules (Architecture Ready)</p> 
              <div className="flex flex-wrap gap-2"> 
                {["Insurance Claims", "Government Schemes", "Audit Logs", "Tax Reports", 
"Department Revenue", "Doctor Revenue", "Financial Forecast", "AI Financial 
Insights"].map((m) => ( 
                  <span key={m} className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs 
font-medium border border-blue-100">{m}</span> 
                ))} 
              </div> 
            </div> 
          </div> 
        )} 
 
        {/* ── Clinical Tab ── */} 
        {activeTab === "clinical" && ( 
          <div className="space-y-6"> 
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"> 
              <StatCard icon="
📅
" label="Total Appointments" value={appointments.length} 
tone="blue" /> 
              <StatCard icon="
✅
" label="Completed" value={completedAppts.length} 
sub={pct(completedAppts.length, appointments.length)} tone="green" /> 
              <StatCard icon="
❌
" label="Cancelled" value={cancelledAppts.length} 
sub={pct(cancelledAppts.length, appointments.length)} tone="red" /> 
              <StatCard icon="
⏳
" label="Pending" value={appointments.filter(a => a.status === 
"Pending").length} tone="yellow" /> 
              <StatCard icon="
🏁
" label="Confirmed" value={appointments.filter(a => a.status === 
"Confirmed").length} tone="teal" /> 
              <StatCard icon="
📅
" label="Today's Appointments" value={todayAppts.length} 
tone="indigo" /> 
            </div> 
 
            <div className={`rounded-xl border p-5 ${cardBg}`}> 
              <h3 className="text-sm font-bold text-slate-700 mb-4">Appointment Status 
Breakdown</h3> 
              <div className="space-y-2"> 
                {["Pending", "Confirmed", "Completed", "Cancelled"].map((s, idx) => { 
                  const colors = ["bg-yellow-400", "bg-blue-400", "bg-green-500", "bg-red-400"]; 
                  const count = appointments.filter(a => a.status === s).length; 
                  return <ProgressBar key={s} label={s} value={count} max={appointments.length || 1} 
color={colors[idx]} />; 
                })} 
              </div> 
            </div> 
 
            <div className={`rounded-xl border p-5 ${cardBg}`}> 
              <h3 className="text-sm font-bold text-slate-700 mb-4">Appointment Trend</h3> 
              <MiniBarChart data={apptChart} color="#8b5cf6" /> 
            </div> 
          </div> 
        )} 
 
        {/* ── Laboratory Tab ── */} 
        {activeTab === "laboratory" && ( 
          <div className="space-y-6"> 
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"> 
              <StatCard icon="
🔬
" label="Total Tests" value={labTests.length} tone="purple" /> 
              <StatCard icon="
✅
" label="Completed Tests" value={labCompleted.length} 
sub={pct(labCompleted.length, labTests.length)} tone="green" /> 
              <StatCard icon="
⏳
" label="Pending Tests" value={labTests.length - 
labCompleted.length} tone="yellow" /> 
            </div> 
 
            <div className={`rounded-xl border p-5 ${cardBg}`}> 
              <h3 className="text-sm font-bold text-slate-700 mb-4">Lab Workload – Last 6 
Months</h3> 
              <MiniBarChart data={labChart} color="#7c3aed" /> 
            </div> 
 
            {labTests.length === 0 ? ( 
              <div className={`rounded-xl border p-8 text-center ${cardBg}`}> 
                <p className="text-slate-400 text-sm">No laboratory records found. Tests added in 
the Laboratory module will appear here.</p> 
              </div> 
            ) : ( 
              <div className={`rounded-xl border overflow-hidden ${cardBg}`}> 
                <table className="w-full text-sm"> 
                  <thead className="bg-slate-50"> 
                    <tr> 
                      {["Test Name", "Patient", "Status", "Date"].map(h => ( 
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 
uppercase">{h}</th> 
                      ))} 
                    </tr> 
                  </thead> 
                  <tbody className="divide-y divide-slate-100"> 
                    {labTests.slice(0, 20).map((t, i) => ( 
                      <tr key={i} className="hover:bg-slate-50"> 
                        <td className="px-4 py-2.5 font-medium text-slate-800">{t.testName || t.name || 
"—"}</td> 
                        <td className="px-4 py-2.5 text-slate-600">{t.patientName || "—"}</td> 
                        <td className="px-4 py-2.5"> 
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.status 
=== "Completed" || t.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 
text-yellow-700"}`}> 
                            {t.status || "Pending"} 
                          </span> 
                        </td> 
                        <td className="px-4 py-2.5 text-slate-500">{fmtDate(t.date || t.createdAt)}</td> 
                      </tr> 
                    ))} 
                  </tbody> 
                </table> 
              </div> 
            )} 
          </div> 
        )} 
 
        {/* ── Pharmacy Tab ── */} 
        {activeTab === "pharmacy" && ( 
          <div className="space-y-6"> 
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"> 
              <StatCard icon="
💊
" label="Total Medicines" value={medicines.length} tone="teal" /> 
              <StatCard icon="
📦
" label="Total Stock Units" value={medicines.reduce((s, m) => s + 
(parseInt(m.stock) || 0), 0)} tone="blue" /> 
              <StatCard icon="
⚠
" label="Low Stock Items" value={lowStock.length} tone="red" /> 
            </div> 
 
            {lowStock.length > 0 && ( 
              <div className="bg-red-50 border border-red-200 rounded-xl p-4"> 
                <h3 className="text-sm font-bold text-red-700 mb-3">
⚠
 Low Stock Alert 
({lowStock.length} items)</h3> 
                <div className="space-y-1"> 
                  {lowStock.map((m, i) => ( 
                    <div key={i} className="flex justify-between text-xs text-red-600"> 
                      <span>{m.name || m.medicineName}</span> 
                      <span className="font-bold">{m.stock} units left</span> 
                    </div> 
                  ))} 
                </div> 
              </div> 
            )} 
 
            {medicines.length === 0 ? ( 
              <div className={`rounded-xl border p-8 text-center ${cardBg}`}> 
                <p className="text-slate-400 text-sm">No pharmacy records found. Medicines 
added in the Pharmacy module will appear here.</p> 
              </div> 
            ) : ( 
              <div className={`rounded-xl border overflow-hidden ${cardBg}`}> 
                <table className="w-full text-sm"> 
                  <thead className="bg-slate-50"> 
                    <tr> 
                      {["Medicine", "Category", "Stock", "Price"].map(h => ( 
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 
uppercase">{h}</th> 
                      ))} 
                    </tr> 
                  </thead> 
                  <tbody className="divide-y divide-slate-100"> 
                    {medicines.slice(0, 20).map((m, i) => ( 
                      <tr key={i} className="hover:bg-slate-50"> 
                        <td className="px-4 py-2.5 font-medium text-slate-800">{m.name || 
m.medicineName || "—"}</td> 
                        <td className="px-4 py-2.5 text-slate-600">{m.category || "—"}</td> 
                        <td className="px-4 py-2.5"> 
                          <span className={`font-semibold ${(parseInt(m.stock) || 0) < 10 ? 
"text-red-600" : "text-green-700"}`}>{m.stock ?? "—"}</span> 
                        </td> 
                        <td className="px-4 py-2.5 text-slate-600">{m.price ? fmt(m.price) : "—"}</td> 
                      </tr> 
                    ))} 
                  </tbody> 
                </table> 
              </div> 
            )} 
          </div> 
        )} 
 
        {/* ── Doctors Tab ── */} 
        {activeTab === "doctors" && ( 
          <div className="space-y-6"> 
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"> 
              <StatCard icon="
󰞯
" label="Total Doctors" value={doctors.length} tone="green" /> 
              <StatCard icon="
🏥
" label="Departments" value={depts.length} tone="blue" /> 
              <StatCard icon="
📅
" label="Appointments / Doctor" value={doctors.length ? 
(appointments.length / doctors.length).toFixed(1) : "—"} tone="purple" /> 
            </div> 
 
            <div className={`rounded-xl border p-5 ${cardBg}`}> 
              <h3 className="text-sm font-bold text-slate-700 mb-4">Department Distribution</h3> 
              <div className="space-y-2"> 
                {depts.slice(0, 10).map((dept) => { 
                  const count = doctors.filter(d => (d.department || d.specialization) === dept).length; 
                  return <ProgressBar key={dept} label={dept} value={count} max={doctors.length || 1} 
color="bg-green-500" />; 
                })} 
                {depts.length === 0 && <p className="text-xs text-slate-400">No department data 
available.</p>} 
              </div> 
            </div> 
 
            {doctors.length === 0 ? ( 
              <div className={`rounded-xl border p-8 text-center ${cardBg}`}> 
                <p className="text-slate-400 text-sm">No doctors found. Add doctors in the Doctors 
module.</p> 
              </div> 
            ) : ( 
              <div className={`rounded-xl border overflow-hidden ${cardBg}`}> 
                <table className="w-full text-sm"> 
                  <thead className="bg-slate-50"> 
                    <tr> 
                      {["Doctor", "Specialization / Dept", "Experience", "Appointments"].map(h => ( 
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 
uppercase">{h}</th> 
                      ))} 
                    </tr> 
                  </thead> 
                  <tbody className="divide-y divide-slate-100"> 
                    {doctors.map((d, i) => { 
                      const apptCount = appointments.filter(a => a.doctor === (d.name || d.fullName) || 
a.doctorId === d.id).length; 
                      return ( 
                        <tr key={i} className="hover:bg-slate-50"> 
                          <td className="px-4 py-2.5 font-medium text-slate-800">{d.name || d.fullName 
|| "—"}</td> 
                          <td className="px-4 py-2.5 text-slate-600">{d.department || d.specialization || 
"—"}</td> 
                          <td className="px-4 py-2.5 text-slate-500">{d.experience ? `${d.experience} 
yrs` : "—"}</td> 
                          <td className="px-4 py-2.5 font-semibold text-blue-700">{apptCount}</td> 
                        </tr> 
                      ); 
                    })} 
                  </tbody> 
                </table> 
              </div> 
            )} 
          </div> 
        )} 
 
        {/* ── Patients Tab ── */} 
        {activeTab === "patients" && ( 
          <div className="space-y-6"> 
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"> 
              <StatCard icon="
󰳋
" label="Total Patients" value={patients.length} tone="blue" /> 
              <StatCard icon="
📋
" label="With Activity" value={patients.filter(p => (p.timeline || 
[]).length > 0).length} tone="green" /> 
              <StatCard icon="
💰
" label="Revenue / Patient" value={fmt(avgRevPerPatient)} 
tone="indigo" /> 
            </div> 
 
            {patients.length === 0 ? ( 
              <div className={`rounded-xl border p-8 text-center ${cardBg}`}> 
                <p className="text-slate-400 text-sm">No patients registered yet. Patients added in 
the Patients module will appear here.</p> 
              </div> 
            ) : ( 
              <div className={`rounded-xl border overflow-hidden ${cardBg}`}> 
                <table className="w-full text-sm"> 
                  <thead className="bg-slate-50"> 
                    <tr> 
                      {["Patient", "Age / Gender", "Blood Group", "Activity Events", "Billing"].map(h => ( 
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 
uppercase">{h}</th> 
                      ))} 
                    </tr> 
                  </thead> 
                  <tbody className="divide-y divide-slate-100"> 
                    {patients.slice(0, 30).map((p, i) => { 
                      const patBills = billing.filter(b => b.patientName?.toLowerCase() === 
p.name?.toLowerCase() || b.patientId === p.id); 
                      const patRev = patBills.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0); 
                      return ( 
                        <tr key={i} className="hover:bg-slate-50"> 
                          <td className="px-4 py-2.5 font-medium text-slate-800">{p.name || "—"}</td> 
                          <td className="px-4 py-2.5 text-slate-600">{[p.age, 
p.gender].filter(Boolean).join(" / ") || "—"}</td> 
                          <td className="px-4 py-2.5"> 
                            {p.bloodGroup ? <span className="px-2 py-0.5 bg-red-50 text-red-700 
rounded text-xs font-bold">{p.bloodGroup}</span> : "—"} 
                          </td> 
                          <td className="px-4 py-2.5 text-slate-600">{(p.timeline || []).length}</td> 
                          <td className="px-4 py-2.5 font-semibold text-green-700">{patRev > 0 ? 
fmt(patRev) : "—"}</td> 
                        </tr> 
                      ); 
                    })} 
                  </tbody> 
                </table> 
              </div> 
            )} 
          </div> 
        )} 
 
      </div> 
    </div> 
  ); 
} 
 
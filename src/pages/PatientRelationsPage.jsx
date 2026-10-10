// src/pages/PatientRelationsPage.jsx
// MediCare Pro — Unified Patient Relations Module
// Consolidates: Overview, Reports, Complaints, and Contact Messages
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ReportsPage from "./ReportsPage";
import ComplaintsPage from "./ComplaintsPage";
import ContactPage from "./ContactPage";
import { PageHeader, StatCard, StatusBadge, ActionButton } from "../components/ui";

export default function PatientRelationsPage({
  darkMode,
  appointments = [],
  addToast = () => {},
  initialTab,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || initialTab || "overview";
  const [activeTab, setActiveTab] = useState(urlTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Load complaints and contact metrics from localStorage
  const complaints = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("complaints") || "[]");
    } catch {
      return [];
    }
  }, [activeTab]);

  const stats = useMemo(() => {
    const totalComplaints = complaints.length;
    const pendingComplaints = complaints.filter(
      (c) => c.status === "Pending" || !c.status
    ).length;
    const inProgressComplaints = complaints.filter(
      (c) => c.status === "In Progress" || c.status === "Under Review"
    ).length;
    const resolvedComplaints = complaints.filter(
      (c) => c.status === "Resolved" || c.status === "Closed"
    ).length;
    const resolutionRate =
      totalComplaints > 0
        ? Math.round((resolvedComplaints / totalComplaints) * 100)
        : 100;

    return {
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      resolutionRate,
      departmentsActive: 6,
    };
  }, [complaints]);

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "reports", label: "Operational Reports", icon: "📑" },
    { id: "complaints", label: "Complaints & Grievances", icon: "💬", badge: stats.pendingComplaints },
    { id: "contact", label: "Contact & Directory", icon: "📞" },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"} py-8 px-4`}>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Patient Relations & Support"
          subtitle="Unified coordination for operational analytics, grievance management, and department communications"
          icon="contact"
        />

        {/* Tab Sub-Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm w-fit">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-cyan-600 text-white shadow"
                    : darkMode
                    ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span
                    className={`ml-1 px-2 py-0.5 text-xs rounded-full font-bold ${
                      isActive ? "bg-white text-cyan-700" : "bg-amber-500 text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview Summary */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Grievances"
                value={stats.totalComplaints}
                icon="feedback"
                color="blue"
                subtitle="Logged patient feedback"
              />
              <StatCard
                title="Pending Review"
                value={stats.pendingComplaints}
                icon="alert"
                color="amber"
                subtitle="Requires department follow-up"
              />
              <StatCard
                title="Resolved Matters"
                value={stats.resolvedComplaints}
                icon="check"
                color="emerald"
                subtitle="Closed with patient consent"
              />
              <StatCard
                title="Resolution Rate"
                value={`${stats.resolutionRate}%`}
                icon="trend"
                color="indigo"
                subtitle="Overall satisfaction index"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions & Departmental Status */}
              <div
                className={`p-6 rounded-2xl border shadow-sm ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <h3 className="text-base font-bold mb-3">Service Channels</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Direct channels for patient inquiries, grievance escalations, and performance audits.
                </p>
                <div className="space-y-2.5">
                  <button
                    onClick={() => handleTabChange("complaints")}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold">Register New Complaint</p>
                      <p className="text-xs text-slate-500">Record feedback from patient desk</p>
                    </div>
                    <span className="text-cyan-500 font-bold">→</span>
                  </button>

                  <button
                    onClick={() => handleTabChange("reports")}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold">View Analytics Reports</p>
                      <p className="text-xs text-slate-500">Hospital financial and operational audit</p>
                    </div>
                    <span className="text-cyan-500 font-bold">→</span>
                  </button>

                  <button
                    onClick={() => handleTabChange("contact")}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold">Department Contacts</p>
                      <p className="text-xs text-slate-500">Helpline directory and contact dispatch</p>
                    </div>
                    <span className="text-cyan-500 font-bold">→</span>
                  </button>
                </div>
              </div>

              {/* Recent Complaints Log Preview */}
              <div
                className={`lg:col-span-2 p-6 rounded-2xl border shadow-sm ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold">Recent Grievance Submissions</h3>
                    <p className="text-xs text-slate-500">Latest active records logged into MediCare Pro</p>
                  </div>
                  <ActionButton
                    label="Open Complaints Desk"
                    variant="default"
                    size="sm"
                    onClick={() => handleTabChange("complaints")}
                  />
                </div>

                {complaints.length === 0 ? (
                  <div className="text-center py-10 text-sm text-slate-500">
                    No complaints registered in the system. The patient relations queue is clear.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {complaints.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between ${
                          darkMode ? "border-slate-800 bg-slate-950/50" : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{item.subject}</span>
                            <span className="text-xs font-mono text-cyan-500">{item.ref}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            From: {item.name} &bull; Dept: {item.dept || "General"} &bull; {item.date}
                          </p>
                        </div>
                        <StatusBadge status={item.status || "Pending"} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Operational Reports */}
        {activeTab === "reports" && (
          <div className="rounded-2xl">
            <ReportsPage darkMode={darkMode} appointments={appointments} />
          </div>
        )}

        {/* Tab 3: Complaints Desk */}
        {activeTab === "complaints" && (
          <div className="rounded-2xl">
            <ComplaintsPage darkMode={darkMode} addToast={addToast} />
          </div>
        )}

        {/* Tab 4: Contact Directory */}
        {activeTab === "contact" && (
          <div className="rounded-2xl">
            <ContactPage darkMode={darkMode} />
          </div>
        )}
      </div>
    </div>
  );
}

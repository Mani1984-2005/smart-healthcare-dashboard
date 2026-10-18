// src/components/HospitalAchievementsCenter.jsx
import { useState, useEffect, useMemo } from "react";
import { INITIAL_ACHIEVEMENTS } from "../data/achievements";
import { 
  Trophy, ShieldCheck, HeartPulse, Sparkles, Plus, CheckCircle2, 
  ChevronDown, ChevronUp, Search, Users, Activity, Award, AlertCircle,
  Eye, X
} from "lucide-react";

export default function HospitalAchievementsCenter({ darkMode = false, userRole = "Admin", addToast = () => {} }) {
  const [achievements, setAchievements] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [expandedId, setExpandedId] = useState(null); // Collapsed by default inside popup!
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // New Submission Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Critical Care Recoveries");
  const [newSummary, setNewSummary] = useState("");
  const [newTeams, setNewTeams] = useState("");
  const [newMetrics, setNewMetrics] = useState("");
  const [newConsentVerified, setNewConsentVerified] = useState(true);
  const [newRecordRef, setNewRecordRef] = useState("");

  // Load achievements from localStorage or initialize
  const loadAchievements = () => {
    try {
      const stored = localStorage.getItem("hospital_achievements");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAchievements(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load achievements from localStorage:", e);
    }
    setAchievements(INITIAL_ACHIEVEMENTS);
    localStorage.setItem("hospital_achievements", JSON.stringify(INITIAL_ACHIEVEMENTS));
  };

  useEffect(() => {
    loadAchievements();
    const handleUpdate = () => loadAchievements();
    window.addEventListener("achievementsUpdated", handleUpdate);
    return () => window.removeEventListener("achievementsUpdated", handleUpdate);
  }, []);

  // Escape key handler to close active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showSubmitModal) setShowSubmitModal(false);
        else if (showReviewModal) setShowReviewModal(false);
        else if (isModalOpen) setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, showSubmitModal, showReviewModal]);

  const saveAchievements = (updatedList) => {
    setAchievements(updatedList);
    localStorage.setItem("hospital_achievements", JSON.stringify(updatedList));
    window.dispatchEvent(new Event("achievementsUpdated"));
  };

  // Filter published achievements and deduplicate by ID
  const publishedAchievements = useMemo(() => {
    const seen = new Set();
    return achievements.filter(a => {
      if (a.status !== "Published") return false;
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [achievements]);

  const pendingAchievements = useMemo(() => {
    return achievements.filter(a => a.status === "Pending Review");
  }, [achievements]);

  const canManageApprovals = userRole === "Admin" || userRole === "Hospital" || userRole === "Executive";
  const canSubmitStories = ["Admin", "Doctor", "Nurse", "Staff", "Hospital", "Receptionist", "Executive"].includes(userRole);

  const categories = [
    "All",
    "Critical Care Recoveries",
    "Patient Safety & Quality",
    "Laboratory & Diagnostics",
    "Emergency Response",
    "Community Health"
  ];

  const filteredList = useMemo(() => {
    return publishedAchievements.filter(item => {
      const matchesCat = activeCategory === "All" || item.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        item.title.toLowerCase().includes(q) || 
        item.summary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [publishedAchievements, activeCategory, searchQuery]);

  // Featured story for the compact highlight bar
  const featuredStory = useMemo(() => {
    return publishedAchievements.find(a => a.isFeatured) || publishedAchievements[0];
  }, [publishedAchievements]);

  const handleSubmitNewStory = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) {
      addToast("Missing details", "Please enter title and summary.", "error");
      return;
    }
    if (!newConsentVerified) {
      addToast("Consent Required", "Please confirm patient de-identification and consent compliance.", "error");
      return;
    }

    const teamsArray = newTeams.split(",").map(t => t.trim()).filter(Boolean);
    const metricsArray = newMetrics.split(",").map(m => {
      const parts = m.split(":");
      return { label: parts[0]?.trim() || "Metric", value: parts[1]?.trim() || "Verified" };
    }).filter(m => m.label && m.value);

    const newStory = {
      id: `ACH-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      categoryIcon: newCategory === "Critical Care Recoveries" ? "❤️‍patient" : newCategory === "Patient Safety & Quality" ? "🛡️" : newCategory === "Laboratory & Diagnostics" ? "🧪" : newCategory === "Emergency Response" ? "⚡" : "🏥",
      categoryColor: newCategory === "Critical Care Recoveries" ? "emerald" : newCategory === "Patient Safety & Quality" ? "blue" : newCategory === "Laboratory & Diagnostics" ? "indigo" : "amber",
      date: new Date().toISOString().split("T")[0],
      summary: newSummary.trim(),
      details: {
        patientDeidentifiedRef: newRecordRef.trim() || "De-identified Record",
        journey: [
          "Case Submission & Clinical Documentation",
          "Multidisciplinary Team Collaboration",
          "Successful Intervention & Patient Care",
          "Verification & Discharge Review"
        ],
        teamsInvolved: teamsArray.length > 0 ? teamsArray : ["Clinical Operations"],
        outcomeMetrics: metricsArray.length > 0 ? metricsArray : [{ label: "Outcome", value: "Verified Success" }],
        verificationNotes: `Submitted by ${userRole} staff member. Awaiting review.`
      },
      verifiedBy: "Pending Verification",
      status: canManageApprovals ? "Published" : "Pending Review",
      submittedBy: userRole,
      targetRoles: ["All"],
      isFeatured: false,
    };

    const updated = [newStory, ...achievements];
    saveAchievements(updated);

    if (canManageApprovals) {
      addToast("Highlight Published!", "New highlight published to the hospital portal.", "success");
    } else {
      addToast("Submitted for Review", "Your highlight has been sent for administrative review.", "success");
    }

    setNewTitle("");
    setNewSummary("");
    setNewTeams("");
    setNewMetrics("");
    setNewRecordRef("");
    setShowSubmitModal(false);
  };

  const handleApproveStory = (id) => {
    const updated = achievements.map(a => a.id === id ? { ...a, status: "Published", verifiedBy: `Approved by ${userRole}` } : a);
    saveAchievements(updated);
    addToast("Story Approved", "The highlight is now published hospital-wide.", "success");
  };

  const handleRejectStory = (id) => {
    const updated = achievements.filter(a => a.id !== id);
    saveAchievements(updated);
    addToast("Submission Removed", "The story was removed.", "info");
  };

  const getCategoryBadgeClass = (cat) => {
    switch (cat) {
      case "Critical Care Recoveries":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800";
      case "Patient Safety & Quality":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800";
      case "Laboratory & Diagnostics":
        return "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800";
      case "Emergency Response":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800";
      case "Community Health":
        return "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800";
      default:
        return "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800";
    }
  };

  // If dismissed for this session, render a small quiet link
  if (isDismissed) {
    return (
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsDismissed(false)}
          className="text-xs text-slate-500 hover:text-cyan-600 dark:text-slate-400 font-bold flex items-center gap-1.5 transition-colors"
        >
          <Trophy size={14} className="text-cyan-600" />
          <span>Show Hospital Highlights</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ── COMPACT INLINE HIGHLIGHT CARD (~90-110px tall) ───────────────── */}
      <div className={`rounded-2xl border shadow-sm p-4 sm:p-5 transition-all duration-300 mb-6 ${
        darkMode ? "bg-slate-900/90 border-slate-800 text-white" : "bg-white border-slate-200/90 text-slate-900"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Icon, Badge, Title & 1-2 line Summary */}
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/10 dark:bg-cyan-950/80 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <Trophy size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                  🏥 Hospital Highlights
                </span>
                {featuredStory && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getCategoryBadgeClass(featuredStory.category)}`}>
                    {featuredStory.categoryIcon} {featuredStory.category}
                  </span>
                )}
              </div>

              {featuredStory ? (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-normal truncate max-w-3xl">
                  <span className="font-bold text-slate-900 dark:text-white">{featuredStory.title}:</span> {featuredStory.summary}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">No new hospital highlights at this time.</p>
              )}
            </div>
          </div>

          {/* Right: Actions (View Highlights Button & Dismiss) */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {publishedAchievements.length > 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
              >
                <Eye size={14} />
                <span>View Highlights ({publishedAchievements.length})</span>
              </button>
            )}

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Dismiss for session"
              aria-label="Dismiss highlight card"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN POPUP MODAL DIALOG ────────────────────────────────────────── */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white leading-none">Hospital Highlights & Achievements</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verified clinical excellence and recovery milestones</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManageApprovals && pendingAchievements.length > 0 && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white font-extrabold text-xs shadow-sm transition-all"
                  >
                    <AlertCircle size={14} />
                    <span>Review Queue ({pendingAchievements.length})</span>
                  </button>
                )}

                {canSubmitStories && (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-sm transition-all"
                  >
                    <Plus size={14} />
                    <span>Submit Highlight</span>
                  </button>
                )}

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors ml-2"
                  aria-label="Close highlights modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Category Tabs & Search Bar */}
            <div className="py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? "bg-cyan-600 text-white shadow-sm"
                        : darkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56 shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter highlights..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {filteredList.length === 0 ? (
                <div className="text-center py-10">
                  <Trophy size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching hospital highlights found</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filter category or search phrase.</p>
                </div>
              ) : (
                filteredList.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        darkMode ? "bg-slate-800/80 border-slate-700/80" : "bg-white border-slate-200/90"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.categoryIcon}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getCategoryBadgeClass(item.category)}`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <span>{item.date}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mb-1.5">
                        {item.title}
                      </h4>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-3">
                        {item.summary}
                      </p>

                      {/* Expandable Clinical Details */}
                      {isExpanded && item.details && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3 text-xs animate-fade-in">
                          {item.details.journey && (
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                                <Activity size={12} className="text-emerald-600" /> Care Journey Steps:
                              </p>
                              <ul className="space-y-1 pl-4 list-disc text-slate-600 dark:text-slate-300">
                                {item.details.journey.map((j, idx) => (
                                  <li key={idx}>{j}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {item.details.outcomeMetrics && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                              {item.details.outcomeMetrics.map((m, idx) => (
                                <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                                  <p className="text-[10px] text-slate-400 font-bold">{m.label}</p>
                                  <p className="text-xs font-black text-cyan-700 dark:text-cyan-400">{m.value}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {item.details.teamsInvolved && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="font-bold text-slate-500">Teams:</span>
                              {item.details.teamsInvolved.map((team, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                                  {team}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-bold">Verification:</span> {item.details.verificationNotes}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end pt-2 mt-1 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors"
                        >
                          <span>{isExpanded ? "Show Less" : "Read Details"}</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 shrink-0">
              <span>Showing {filteredList.length} approved hospital highlights</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SUBMIT PROPOSED ACHIEVEMENT ────────────────────────────── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-cyan-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">Submit Proposed Hospital Highlight</h3>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewStory} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Highlight Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Critical Trauma Recovery after Surgical Intervention"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="Critical Care Recoveries">Critical Care Recoveries</option>
                  <option value="Patient Safety & Quality">Patient Safety & Quality</option>
                  <option value="Laboratory & Diagnostics">Laboratory & Diagnostics</option>
                  <option value="Emergency Response">Emergency Response</option>
                  <option value="Community Health">Community Health</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Factual Summary *</label>
                <textarea
                  required
                  rows={3}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Describe the clinical intervention, recovery milestone, or safety outcome..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Teams & Departments Involved</label>
                <input
                  type="text"
                  value={newTeams}
                  onChange={(e) => setNewTeams(e.target.value)}
                  placeholder="e.g. Cardiothoracic Surgery, ICU Nursing"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Supporting Metrics (label: value)</label>
                <input
                  type="text"
                  value={newMetrics}
                  onChange={(e) => setNewMetrics(e.target.value)}
                  placeholder="e.g. Recovery Rate: 100%, ICU Stay: 3 Days"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Supporting Record Reference</label>
                <input
                  type="text"
                  value={newRecordRef}
                  onChange={(e) => setNewRecordRef(e.target.value)}
                  placeholder="e.g. EHR Log #PAT-8842 or Quality Audit #QA-2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Patient Privacy Compliance Checkbox */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="consentCheck"
                  checked={newConsentVerified}
                  onChange={(e) => setNewConsentVerified(e.target.checked)}
                  className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="consentCheck" className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-snug cursor-pointer">
                  <span className="font-extrabold">Patient Privacy Compliance:</span> I confirm that all patient details are strictly de-identified and no confidential medical records are exposed.
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md transition-all"
                >
                  {canManageApprovals ? "Publish Highlight" : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REVIEW PENDING SUBMISSIONS ─────────────────────────────── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-500" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">Review Pending Highlight Submissions</h3>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg">
                ✕
              </button>
            </div>

            {pendingAchievements.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-sm">All submissions reviewed!</p>
                <p className="text-xs text-slate-400">There are no pending stories awaiting approval.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAchievements.map(item => (
                  <div key={item.id} className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-amber-800 dark:text-amber-300">{item.category}</span>
                      <span className="text-slate-400">Submitted by: {item.submittedBy}</span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-1">{item.title}</h4>
                    <p className="text-slate-700 dark:text-slate-300 mb-3">{item.summary}</p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/60 dark:border-slate-700">
                      <button
                        onClick={() => handleRejectStory(item.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveStory(item.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow"
                      >
                        Approve & Publish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

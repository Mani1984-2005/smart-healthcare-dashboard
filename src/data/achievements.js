// src/data/achievements.js

export const INITIAL_ACHIEVEMENTS = [
  {
    id: "ACH-2026-001",
    title: "Remarkable Critical-Care Recovery — Multi-Disciplinary Trauma Success",
    category: "Critical Care Recoveries",
    categoryIcon: "❤️‍🩹",
    categoryColor: "emerald",
    date: "2026-10-12",
    summary: "Complex emergency trauma intervention for a 58-year-old patient admitted in severe cardiac shock. Through coordinated cardiothoracic surgery, continuous ICU monitoring, and targeted therapy, normal cardiac ejection fraction was restored.",
    details: {
      patientDeidentifiedRef: "PAT-8842 (De-identified with consent)",
      journey: [
        "24/7 Emergency Trauma Admission & STAT Triage",
        "Immediate Critical-Care & Surgical Stabilization",
        "72-Hour Intensive Monitoring in ICU Unit-A",
        "Targeted Cardiac Rehabilitation & Physical Therapy",
        "Full Clinical Recovery & Successful Discharge Home"
      ],
      teamsInvolved: [
        "Cardiothoracic Surgery Dept",
        "ICU Critical-Care Nursing Team",
        "Emergency Trauma Response Unit",
        "Clinical Pharmacy & Therapeutics"
      ],
      outcomeMetrics: [
        { label: "Recovery Outcome", value: "100% Functional Restoration" },
        { label: "ICU Stay", value: "3.5 Days (24h ahead of benchmark)" },
        { label: "Discharge Status", value: "Stable, Ambulatory at Home" }
      ],
      verificationNotes: "Clinical record verified by Dr. Robert Vance, Chief of Surgery. De-identified patient consent logged on file (Consent ID: C-2026-091).",
    },
    verifiedBy: "Dr. Robert Vance, MD, FRCS (Chief of Surgery)",
    status: "Published", // "Published" | "Pending Review" | "Draft"
    submittedBy: "Dr. Robert Vance",
    targetRoles: ["All"],
    isFeatured: true,
  },
  {
    id: "ACH-2026-002",
    title: "Zero Hospital-Acquired Infections — 180 Consecutive Days Milestone",
    category: "Patient Safety & Quality",
    categoryIcon: "🛡️",
    categoryColor: "blue",
    date: "2026-10-10",
    summary: "The Intensive Care Unit and Surgical Wards achieved 180 consecutive days with zero catheter-associated or surgical site infections due to strict sterile protocol compliance.",
    details: {
      patientDeidentifiedRef: "Hospital-wide ICU & Surgical Ward Audit",
      journey: [
        "Implementation of Smart Sterilization Audits",
        "Daily Infection-Control Bedside Rounds",
        "100% Hand Hygiene Compliance by Nursing & Medical Staff",
        "Bi-Weekly Environmental Air & Surface Sampling"
      ],
      teamsInvolved: [
        "Infection Control Board",
        "Inpatient Nursing Operations",
        "Surgical Quality Committee"
      ],
      outcomeMetrics: [
        { label: "Infection Rate", value: "0.0 per 1,000 patient days" },
        { label: "Clean Days", value: "180 Consecutive Days" },
        { label: "Benchmark Variance", value: "-100% vs National Avg" }
      ],
      verificationNotes: "Audited and verified by Hospital Quality Assurance Committee.",
    },
    verifiedBy: "Dr. Elizabeth Cole, PhD (Head of Quality)",
    status: "Published",
    submittedBy: "Quality Board",
    targetRoles: ["All"],
    isFeatured: false,
  },
  {
    id: "ACH-2026-003",
    title: "STAT Pathology & Lab Turnaround Reduced to Under 22 Minutes",
    category: "Laboratory & Diagnostics",
    categoryIcon: "🧪",
    categoryColor: "indigo",
    date: "2026-10-08",
    summary: "With automated barcode tracking and rapid specimen analyzers, the Laboratory team cut STAT blood sample processing time from 45 minutes to an average of 21.4 minutes.",
    details: {
      patientDeidentifiedRef: "Laboratory STAT Specimen Log #LAB-992",
      journey: [
        "Barcoded Pneumatic Specimen Transport System",
        "Immediate Automated Specimen Intake & Sorting",
        "High-Throughput Clinical Analyzer Deployment",
        "Direct EHR Integration for Real-Time Result Dispatch"
      ],
      teamsInvolved: [
        "Pathology & Clinical Laboratory Team",
        "Emergency Department Triage",
        "Health Informatics & Systems"
      ],
      outcomeMetrics: [
        { label: "Avg STAT Turnaround", value: "21.4 Mins" },
        { label: "Processing Efficiency", value: "+52.4% Improvement" },
        { label: "Specimen Error Rate", value: "< 0.01%" }
      ],
      verificationNotes: "Verified by Chief Pathologist & Hospital IT Systems Audit.",
    },
    verifiedBy: "Dr. Marcus Thorne (Lead Pathologist)",
    status: "Published",
    submittedBy: "Laboratory Directorate",
    targetRoles: ["All"],
    isFeatured: false,
  },
  {
    id: "ACH-2026-004",
    title: "Community Health & Free Screening Drive — 450+ Citizens Served",
    category: "Community Health",
    categoryIcon: "🏥",
    categoryColor: "teal",
    date: "2026-10-05",
    summary: "Over 450 community members received complimentary cardiovascular risk screenings, diabetes testing, blood pressure checks, and preventive consultations.",
    details: {
      patientDeidentifiedRef: "Community Health Outreach Event #CH-2026-10",
      journey: [
        "Auditorium Setup for Multi-Station Screening",
        "Free ECG, Blood Sugar, and BMI Diagnostics",
        "Specialist Physician Consultations",
        "Follow-Up OPD Scheduling for High-Risk Individuals"
      ],
      teamsInvolved: [
        "Community Outreach & Wellness Team",
        "General Medicine OPD Specialists",
        "Nursing & Volunteer Guild"
      ],
      outcomeMetrics: [
        { label: "Participants Served", value: "452 Citizens" },
        { label: "High-Risk Identified", value: "38 Patients Scheduled for Early Intervention" },
        { label: "Blood Units Donated", value: "85 Donors" }
      ],
      verificationNotes: "Event verified by Community Health Board.",
    },
    verifiedBy: "Community Outreach Directorate",
    status: "Published",
    submittedBy: "Outreach Team",
    targetRoles: ["All"],
    isFeatured: false,
  },
  {
    id: "ACH-2026-005",
    title: "Golden-Hour Stroke Triage Acceleration — Door-to-Needle Time 18 Mins",
    category: "Emergency Response",
    categoryIcon: "⚡",
    categoryColor: "amber",
    date: "2026-10-01",
    summary: "Emergency stroke response team achieved a record 18-minute door-to-needle thrombolytic therapy time, significantly reducing neurological deficit in acute stroke patients.",
    details: {
      patientDeidentifiedRef: "Stroke Emergency Registry Log #ST-2026-44",
      journey: [
        "Pre-Hospital Ambulance Notification System",
        "Direct ED-to-CT Imaging Protocol",
        "Immediate On-Call Neurologist Evaluation",
        "Bedside Thrombolytic Administration"
      ],
      teamsInvolved: [
        "Emergency Medicine Physicians",
        "Stroke Neurology Team",
        "Radiology & CT Suite Specialists"
      ],
      outcomeMetrics: [
        { label: "Door-to-Needle Avg", value: "18.2 Minutes" },
        { label: "AHA Target Standard", value: "60 Minutes" },
        { label: "Patient Functional Recovery", value: "Exceeding 92%" }
      ],
      verificationNotes: "Stroke Registry Audit Log #ST-2026-44.",
    },
    verifiedBy: "Dr. Sarah Jenkins (Head of Emergency Medicine)",
    status: "Published",
    submittedBy: "Emergency Medicine Dept",
    targetRoles: ["All"],
    isFeatured: false,
  },
];

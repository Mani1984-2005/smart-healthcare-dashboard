// src/services/physicianWorkspace/localDemoData.ts
//
// Part 5 — Physician AI Workspace — local (offline) demo data.
// Synthetic clinical cases only, mirroring backend/services/
// physicianWorkspace/demoData.js so the offline fallback tells the same
// demo story as the backend-connected path. None of this represents a real
// patient.

import type { ClinicalCase } from "../../types/physicianWorkspace";

export function getLocalDemoCases(): ClinicalCase[] {
  return [
    {
      id: "CASE-2001",
      patientId: "P-1001",
      patientName: "Amrita Singh",
      age: 34,
      gender: "Female",
      presentingComplaint: "Intermittent chest tightness and mild breathlessness for 3 days",
      historyOfPresentIllness:
        "Reports episodic retrosternal chest tightness, lasting 5-10 minutes, occasionally radiating to the left shoulder. Denies syncope. Mild breathlessness on exertion. No fever.",
      pastMedicalHistory: ["Hypertension (diagnosed 2022)", "Seasonal allergic rhinitis"],
      medications: ["Amlodipine 5mg once daily"],
      allergies: ["Penicillin (rash)"],
      familyHistory: "Father: coronary artery disease diagnosed at age 58.",
      socialHistory: "Non-smoker. Occasional alcohol use. Works a sedentary office job.",
      vitals: [
        { label: "Blood pressure", value: "138/86 mmHg" },
        { label: "Heart rate", value: "88 bpm" },
        { label: "Temperature", value: "98.4°F" },
        { label: "SpO2", value: "97%" },
      ],
      labResults: [
        { test: "Troponin I", value: "0.02 ng/mL", flag: "Normal" },
        { test: "ECG", value: "Sinus rhythm, no acute ST changes", flag: "Normal" },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "CASE-2002",
      patientId: "P-1002",
      patientName: "Rahul Mehra",
      age: 47,
      gender: "Male",
      presentingComplaint: "Fatigue, increased thirst and blurred vision for 2 weeks",
      historyOfPresentIllness:
        "Progressive fatigue and polyuria over two weeks. Reports blurred vision, worse by evening. No known trauma. No chest pain or breathlessness.",
      pastMedicalHistory: ["Type 2 diabetes mellitus (2019)", "Dyslipidaemia"],
      medications: ["Metformin 500mg twice daily", "Atorvastatin 10mg at night"],
      allergies: [],
      familyHistory: "Mother: type 2 diabetes. Sister: hypothyroidism.",
      socialHistory: "Former smoker (quit 2020). Sedentary lifestyle, irregular meal timing.",
      vitals: [
        { label: "Blood pressure", value: "128/82 mmHg" },
        { label: "Heart rate", value: "76 bpm" },
      ],
      labResults: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "CASE-2003",
      patientId: "P-1004",
      patientName: "Sanjay Kapoor",
      age: 62,
      gender: "Male",
      presentingComplaint: "Sudden onset severe chest pain radiating to the left arm",
      historyOfPresentIllness:
        "Sudden-onset crushing central chest pain approximately 40 minutes ago, radiating to the left arm and jaw, associated with sweating and breathlessness. Known coronary artery disease with prior bypass surgery.",
      pastMedicalHistory: ["Coronary artery disease", "Prior coronary artery bypass graft (2021)", "Hyperlipidaemia"],
      medications: ["Aspirin 75mg once daily", "Atorvastatin 40mg at night", "Metoprolol 25mg twice daily"],
      allergies: ["Sulfa drugs (hives)"],
      familyHistory: "Not documented.",
      socialHistory: "Not documented.",
      vitals: [
        { label: "Blood pressure", value: "96/60 mmHg" },
        { label: "Heart rate", value: "112 bpm" },
        { label: "SpO2", value: "93%" },
      ],
      labResults: [{ test: "Troponin I", value: "1.8 ng/mL", flag: "Critical" }],
      createdAt: new Date().toISOString(),
    },
  ];
}

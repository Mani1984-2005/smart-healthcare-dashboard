// src/utils/summarizer.js

function cleanText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function truncate(text = "", max = 180) {
  const t = cleanText(text);
  if (t.length <= max) return t;
  return t.slice(0, max - 3) + "...";
}

export function summarizePatientHistory(patient = {}) {
  const parts = [];
  if (patient.name) parts.push(`${patient.name}`);
  if (patient.age || patient.dob) parts.push(`age ${patient.age || "N/A"}`);
  if (patient.gender) parts.push(patient.gender);
  if (patient.disease) parts.push(`presenting with ${patient.disease}`);
  if (patient.chronicDiseases) parts.push(`history of ${patient.chronicDiseases}`);
  if (patient.allergies) parts.push(`allergies: ${patient.allergies}`);
  if (patient.currentMedications) parts.push(`medications: ${patient.currentMedications}`);
  if (patient.visitNotes) parts.push(`notes: ${truncate(patient.visitNotes, 120)}`);
  return cleanText(parts.join(", "));
}

export function summarizeVisit(visit = {}) {
  const date = visit.date || visit.createdAt || "Unknown date";
  const type = visit.type || "Visit";
  const title = visit.title || "Clinical encounter";
  const details = truncate(visit.details || visit.notes || "", 140);
  return cleanText(`${date} | ${type} | ${title}${details ? ` — ${details}` : ""}`);
}

export function compressMedicalNote(note = "") {
  const text = cleanText(note);
  if (!text) return "";
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length === 1) return truncate(text, 180);
  return truncate(sentences.slice(0, 2).join(" "), 220);
}

export function buildTimelineSummary(timeline = []) {
  if (!Array.isArray(timeline) || timeline.length === 0) return "No visit history available.";
  const recent = timeline.slice(-3).map(summarizeVisit);
  return recent.join(" | ");
}
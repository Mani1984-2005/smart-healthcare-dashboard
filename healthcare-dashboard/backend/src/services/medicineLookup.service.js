import { MEDICINE_DATABASE, MEDICINE_NAME_INDEX, getMedicineById } from '../data/medicineDatabase.js';

// ---------------------------------------------------------------------
// Small offline Levenshtein-distance fuzzy matcher — no external NLP
// dependency needed. Good enough to absorb common OCR noise (0/O, 1/l,
// missing/extra letters) on drug names.
// ---------------------------------------------------------------------
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const MIN_TOKEN_LEN = 4; // ignore very short tokens ("bd", "mg", "od") that would false-positive
const FUZZY_THRESHOLD = 0.78;

/**
 * Attempts to find the best medicine-name match for a single word/phrase.
 * Returns { medicine, matchedName, matchKind, confidence } or null.
 */
export function matchMedicineToken(token) {
  const clean = token.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length < MIN_TOKEN_LEN) return null;

  // 1. Exact match (generic or brand)
  const exact = MEDICINE_NAME_INDEX.find((entry) => entry.name === clean);
  if (exact) {
    return {
      medicine: getMedicineById(exact.id),
      matchedName: exact.name,
      matchKind: exact.kind,
      confidence: 1,
    };
  }

  // 2. Substring containment (handles concatenated OCR artifacts)
  const contains = MEDICINE_NAME_INDEX.find(
    (entry) => entry.name.length >= MIN_TOKEN_LEN && (clean.includes(entry.name) || entry.name.includes(clean))
  );
  if (contains) {
    return {
      medicine: getMedicineById(contains.id),
      matchedName: contains.name,
      matchKind: contains.kind,
      confidence: 0.9,
    };
  }

  // 3. Fuzzy match (Levenshtein similarity)
  let best = null;
  for (const entry of MEDICINE_NAME_INDEX) {
    if (entry.name.length < MIN_TOKEN_LEN) continue;
    const score = similarity(clean, entry.name);
    if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) {
      best = { entry, score };
    }
  }
  if (best) {
    return {
      medicine: getMedicineById(best.entry.id),
      matchedName: best.entry.name,
      matchKind: best.entry.kind,
      confidence: Number(best.score.toFixed(2)),
    };
  }

  return null;
}

/**
 * Scans free text (a line, or the whole OCR blob) and returns every
 * distinct medicine match found, best-scoring first.
 */
export function findMedicinesInText(text) {
  if (!text) return [];
  const tokens = text
    .split(/[\s,;:()/\\\-]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Also try 2-word windows for multi-word brand names (rare in this KB but future-proof)
  const candidates = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    candidates.push(`${tokens[i]}${tokens[i + 1]}`);
  }

  const foundById = new Map();
  for (const token of candidates) {
    const match = matchMedicineToken(token);
    if (!match) continue;
    const existing = foundById.get(match.medicine.id);
    if (!existing || match.confidence > existing.confidence) {
      foundById.set(match.medicine.id, match);
    }
  }

  return [...foundById.values()].sort((a, b) => b.confidence - a.confidence);
}

export function listAllMedicineNames() {
  return MEDICINE_DATABASE.map((m) => ({ id: m.id, genericName: m.genericName, brandNames: m.brandNames }));
}

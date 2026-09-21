// Part 3 — minimum self-contained SYNTHETIC patient references. Not real people; not read from any other module's tables.
export const SYNTHETIC_PATIENTS = Object.freeze([
  Object.freeze({ id: "DEMO-P001", displayName: "Demo Patient A", ageYears: 54, sex: "M", synthetic: true }),
  Object.freeze({ id: "DEMO-P002", displayName: "Demo Patient B", ageYears: 37, sex: "F", synthetic: true }),
]);

export const findPatient = (id) => SYNTHETIC_PATIENTS.find((p) => p.id === id) ?? null;

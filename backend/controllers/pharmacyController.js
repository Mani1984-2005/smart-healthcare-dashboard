// backend/controllers/pharmacyController.js
// MediCare Pro — Integrated Pharmacy & Prescription Controller

const Medicine = require("../models/Medicine");
const {
  createPrescription,
  addMedicine,
  getPrescriptionsByPatient,
  getPrescriptionById,
  getAllPrescriptions,
  updatePrescriptionStatus,
  deleteMedicine,
  deletePrescription,
} = require("../models/Prescription");

// ==============================================================================
// ─── Drug Interaction Rule Engine ─────────────────────────────────────────────
// ==============================================================================
const DRUG_INTERACTIONS = {
  warfarin: [
    { drug: "aspirin",     severity: "HIGH",   message: "Warfarin + Aspirin: Increased bleeding risk. Monitor INR closely." },
    { drug: "ibuprofen",   severity: "HIGH",   message: "Warfarin + Ibuprofen: Increased anticoagulant effect and bleeding risk." },
    { drug: "naproxen",    severity: "HIGH",   message: "Warfarin + Naproxen: Potentiates anticoagulation. Avoid combination." },
    { drug: "metronidazole", severity: "HIGH", message: "Warfarin + Metronidazole: Significantly increases INR. Reduce warfarin dose." },
    { drug: "fluconazole", severity: "HIGH",   message: "Warfarin + Fluconazole: Strong CYP2C9 inhibitor. INR may double." },
    { drug: "amiodarone",  severity: "HIGH",   message: "Warfarin + Amiodarone: Potentiates anticoagulation, risk of hemorrhage." },
  ],
  metformin: [
    { drug: "alcohol",     severity: "MODERATE", message: "Metformin + Alcohol: Increased risk of lactic acidosis." },
    { drug: "contrast dye", severity: "HIGH",   message: "Metformin + Iodinated Contrast: Hold metformin 48h before/after imaging." },
  ],
  simvastatin: [
    { drug: "amiodarone",    severity: "HIGH",   message: "Simvastatin + Amiodarone: Increased myopathy risk. Max simvastatin 20mg." },
    { drug: "clarithromycin",severity: "HIGH",   message: "Simvastatin + Clarithromycin: CYP3A4 inhibition → rhabdomyolysis risk." },
    { drug: "fluconazole",   severity: "HIGH",   message: "Simvastatin + Fluconazole: Severe myopathy risk. Avoid combination." },
    { drug: "amlodipine",    severity: "MODERATE", message: "Simvastatin + Amlodipine: Max simvastatin 20mg when combined." },
  ],
  amlodipine: [
    { drug: "simvastatin",   severity: "MODERATE", message: "Amlodipine + Simvastatin: Limit simvastatin to 20mg/day." },
    { drug: "clarithromycin",severity: "MODERATE", message: "Amlodipine + Clarithromycin: Increased hypotension risk." },
  ],
  metoprolol: [
    { drug: "verapamil",     severity: "HIGH",   message: "Metoprolol + Verapamil: Risk of severe bradycardia and AV block." },
    { drug: "diltiazem",     severity: "HIGH",   message: "Metoprolol + Diltiazem: Additive bradycardia. Monitor heart rate." },
    { drug: "fluoxetine",    severity: "MODERATE", message: "Metoprolol + Fluoxetine: CYP2D6 inhibition increases metoprolol levels." },
  ],
  aspirin: [
    { drug: "warfarin",      severity: "HIGH",   message: "Aspirin + Warfarin: Increased bleeding risk. Use lowest effective dose." },
    { drug: "ibuprofen",     severity: "MODERATE", message: "Aspirin + Ibuprofen: NSAIDs reduce cardioprotective effect of aspirin." },
    { drug: "clopidogrel",   severity: "MODERATE", message: "Aspirin + Clopidogrel: Dual antiplatelet — increased GI bleed risk." },
    { drug: "methotrexate",  severity: "HIGH",   message: "Aspirin + Methotrexate: Reduced methotrexate clearance, toxicity risk." },
  ],
  ciprofloxacin: [
    { drug: "theophylline",  severity: "HIGH",   message: "Ciprofloxacin + Theophylline: CYP1A2 inhibition, theophylline toxicity." },
    { drug: "tizanidine",    severity: "HIGH",   message: "Ciprofloxacin + Tizanidine: Dramatic increase in tizanidine levels." },
    { drug: "warfarin",      severity: "MODERATE", message: "Ciprofloxacin + Warfarin: May increase INR. Monitor closely." },
    { drug: "antacids",      severity: "LOW",    message: "Ciprofloxacin + Antacids: Reduces ciprofloxacin absorption. Take 2h apart." },
  ],
  codeine: [
    { drug: "tramadol",     severity: "HIGH",   message: "Codeine + Tramadol: Additive CNS/respiratory depression risk." },
    { drug: "diazepam",     severity: "HIGH",   message: "Codeine + Diazepam: Profound sedation and respiratory depression." },
    { drug: "alcohol",      severity: "HIGH",   message: "Codeine + Alcohol: Severe CNS depression, do not combine." },
  ],
  lisinopril: [
    { drug: "potassium",    severity: "MODERATE", message: "Lisinopril + Potassium supplements: Risk of hyperkalemia." },
    { drug: "spironolactone",severity: "MODERATE", message: "Lisinopril + Spironolactone: Hyperkalemia risk. Monitor electrolytes." },
    { drug: "nsaids",       severity: "MODERATE", message: "Lisinopril + NSAIDs: Reduced antihypertensive effect, renal impairment." },
  ],
};

// ==============================================================================
// ─── Rule-Based Dosage Calculator ─────────────────────────────────────────────
// ==============================================================================
const DOSAGE_RULES = {
  amoxicillin:       { standard: "500mg",  frequency: "3 times daily", duration: "7 days",  timing: "With or without food", route: "Oral", form: "Capsule",  warnings: ["Complete full course", "Monitor for allergic reaction"] },
  azithromycin:      { standard: "500mg",  frequency: "Once daily",    duration: "3-5 days",timing: "With food to reduce GI upset", route: "Oral", form: "Tablet", warnings: ["Do not take with antacids"] },
  ciprofloxacin:     { standard: "500mg",  frequency: "Twice daily",   duration: "7-14 days",timing: "Empty stomach preferred", route: "Oral", form: "Tablet", warnings: ["Avoid dairy", "Avoid sun exposure", "Do not take with antacids"] },
  metronidazole:     { standard: "400mg",  frequency: "3 times daily", duration: "7 days",  timing: "After food",            route: "Oral", form: "Tablet",  warnings: ["Avoid alcohol completely", "May cause metallic taste"] },
  doxycycline:       { standard: "100mg",  frequency: "Twice daily",   duration: "7-14 days",timing: "With plenty of water, after food", route: "Oral", form: "Capsule", warnings: ["Avoid sunlight", "Avoid dairy products", "Take upright"] },
  paracetamol:       { standard: "500mg",  frequency: "Every 4-6 hours (max 4 doses/day)", duration: "As needed", timing: "Any time", route: "Oral", form: "Tablet", warnings: ["Max 4g/day", "Avoid alcohol", "Check other products for paracetamol"] },
  ibuprofen:         { standard: "400mg",  frequency: "Every 6-8 hours", duration: "5-7 days", timing: "After food",  route: "Oral", form: "Tablet", warnings: ["Take with food", "Avoid in renal impairment", "Caution in heart disease"] },
  aspirin:           { standard: "75mg",   frequency: "Once daily (antiplatelet)", duration: "Long-term", timing: "After food", route: "Oral", form: "Tablet", warnings: ["Do not crush or chew EC tablets", "Avoid in children under 16", "Risk of GI bleed"] },
  amlodipine:        { standard: "5mg",    frequency: "Once daily",    duration: "Long-term",timing: "Any time, same time daily", route: "Oral", form: "Tablet", warnings: ["May cause ankle swelling", "Do not stop abruptly"] },
  metoprolol:        { standard: "50mg",   frequency: "Twice daily",   duration: "Long-term",timing: "With or after food", route: "Oral", form: "Tablet", warnings: ["Do not stop abruptly — taper", "Monitor heart rate", "Avoid abrupt withdrawal"] },
  lisinopril:        { standard: "10mg",   frequency: "Once daily",    duration: "Long-term",timing: "Any time, consistent", route: "Oral", form: "Tablet", warnings: ["May cause dry cough", "Monitor potassium", "Avoid in pregnancy"] },
  atorvastatin:      { standard: "20mg",   frequency: "Once daily (evening)", duration: "Long-term", timing: "Evening", route: "Oral", form: "Tablet", warnings: ["Report muscle pain immediately", "Avoid grapefruit juice", "Liver function monitoring"] },
  simvastatin:       { standard: "20mg",   frequency: "Once daily (evening)", duration: "Long-term", timing: "Evening", route: "Oral", form: "Tablet", warnings: ["Avoid grapefruit", "Report muscle pain or weakness"] },
  warfarin:          { standard: "Individualized per INR", frequency: "Once daily", duration: "Long-term", timing: "Same time each day", route: "Oral", form: "Tablet", warnings: ["Regular INR monitoring essential", "Many drug & food interactions", "Report any unusual bleeding"] },
  metformin:         { standard: "500mg",  frequency: "Twice daily with meals", duration: "Long-term", timing: "With meals", route: "Oral", form: "Tablet", warnings: ["Take with food to reduce GI upset", "Hold before contrast procedures", "Monitor renal function"] },
  glibenclamide:     { standard: "5mg",    frequency: "Once daily before breakfast", duration: "Long-term", timing: "Before breakfast", route: "Oral", form: "Tablet", warnings: ["Monitor blood glucose", "Risk of hypoglycemia", "Avoid skipping meals"] },
  omeprazole:        { standard: "20mg",   frequency: "Once daily",    duration: "4-8 weeks",timing: "30 mins before breakfast", route: "Oral", form: "Capsule", warnings: ["Take before eating", "Long-term use may reduce B12 and Mg"] },
  pantoprazole:      { standard: "40mg",   frequency: "Once daily",    duration: "4-8 weeks",timing: "30-60 mins before meal", route: "Oral", form: "Tablet", warnings: ["Swallow whole", "Long-term use — monitor Mg"] },
  ondansetron:       { standard: "4mg",    frequency: "Every 8 hours (as needed)", duration: "2-3 days", timing: "Before meals", route: "Oral", form: "Tablet", warnings: ["May cause headache", "Caution in liver disease", "QT prolongation risk"] },
  salbutamol:        { standard: "2.5mg",  frequency: "Every 4-6 hours (as needed)", duration: "As needed", timing: "As needed", route: "Inhalation", form: "Inhaler", warnings: ["Shake before use", "Rinse mouth after", "Not for long-term daily use alone"] },
  montelukast:       { standard: "10mg",   frequency: "Once daily",    duration: "Long-term",timing: "Evening",            route: "Oral", form: "Tablet", warnings: ["May cause mood changes", "Report behavioral changes"] },
  diazepam:          { standard: "5mg",    frequency: "Twice daily",   duration: "Short-term (max 4 weeks)", timing: "Any time", route: "Oral", form: "Tablet", warnings: ["Risk of dependence", "Avoid driving", "Do not mix with alcohol"] },
  pregabalin:        { standard: "75mg",   frequency: "Twice daily",   duration: "As directed", timing: "Any time", route: "Oral", form: "Capsule", warnings: ["Drowsiness — avoid driving", "Taper when stopping", "Renal dose adjustment required"] },
};

// ==============================================================================
// ─── Engine Helper Utilities ──────────────────────────────────────────────────
// ==============================================================================

const checkInteractions = (medicineList) => {
  const interactions = [];
  const names = medicineList.map((m) => m.medicine_name.toLowerCase().trim());

  for (let i = 0; i < names.length; i++) {
    const drug = names[i];
    const rules = DRUG_INTERACTIONS[drug];
    if (!rules) continue;

    for (const rule of rules) {
      const interactsWith = names.find(
        (n, idx) => idx !== i && n.includes(rule.drug.toLowerCase())
      );
      if (interactsWith) {
        const alreadyLogged = interactions.find((x) => x.message === rule.message);
        if (!alreadyLogged) {
          interactions.push({
            severity: rule.severity,
            drugs: [names[i], interactsWith],
            message: rule.message,
          });
        }
      }
    }
  }
  return interactions;
};

const getDosageSuggestion = (medicineName) => {
  const key = medicineName.toLowerCase().trim();
  if (DOSAGE_RULES[key]) return DOSAGE_RULES[key];
  const found = Object.keys(DOSAGE_RULES).find((k) => key.includes(k) || k.includes(key.split(" ")[0]));
  return found ? DOSAGE_RULES[found] : null;
};

const buildQRPayload = (prescription, medicines) => {
  const payload = {
    rxId: prescription.prescription_id,
    patId: prescription.patient_id,
    patient: prescription.patient_name,
    doctor: prescription.doctor_name || "—",
    date: new Date().toISOString().split("T")[0],
    diagnosis: prescription.diagnosis || "",
    drugs: medicines.map((m) => ({
      name: m.medicine_name,
      dose: m.dosage_strength,
      freq: m.frequency,
      dur: m.duration,
    })),
  };
  return JSON.stringify(payload);
};

const generateRxId = () => `RX-${Date.now()}`;

// ==============================================================================
// ─── Medicine Management Controllers (From File 1) ───────────────────────────
// ==============================================================================

exports.listMedicines = async (req, res) => {
  try {
    const { search = "", category = "", form = "", page = 1, limit = 20 } = req.query;
    const result = await Medicine.findAll({
      search,
      category,
      form,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("listMedicines:", err);
    res.status(500).json({ success: false, error: "Failed to fetch medicines." });
  }
};

exports.getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, error: "Medicine not found." });
    res.json({ success: true, medicine });
  } catch (err) {
    console.error("getMedicine:", err);
    res.status(500).json({ success: false, error: "Failed to fetch medicine." });
  }
};

exports.createMedicine = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Medicine name is required." });
    const medicine = await Medicine.create(req.body);
    res.status(201).json({ success: true, medicine });
  } catch (err) {
    console.error("createMedicine:", err);
    res.status(500).json({ success: false, error: "Failed to create medicine." });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.update(req.params.id, req.body);
    if (!medicine) return res.status(404).json({ success: false, error: "Medicine not found." });
    res.json({ success: true, medicine });
  } catch (err) {
    console.error("updateMedicine:", err);
    res.status(500).json({ success: false, error: "Failed to update medicine." });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    await Medicine.delete(req.params.id);
    res.json({ success: true, message: "Medicine deactivated." });
  } catch (err) {
    console.error("deleteMedicine:", err);
    res.status(500).json({ success: false, error: "Failed to delete medicine." });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Medicine.getCategories();
    res.json({ success: true, categories });
  } catch (err) {
    console.error("getCategories:", err);
    res.status(500).json({ success: false, error: "Failed to fetch categories." });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const medicines = await Medicine.getLowStock();
    res.json({ success: true, medicines });
  } catch (err) {
    console.error("getLowStock:", err);
    res.status(500).json({ success: false, error: "Failed to fetch low-stock medicines." });
  }
};

// ==============================================================================
// ─── Engine and Prescription Controllers (From File 2) ───────────────────────
// ==============================================================================

// GET /api/pharmacy/dosage-suggestion?name=amoxicillin
exports.getDosageSuggestion = (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "Medicine name required" });
  const suggestion = getDosageSuggestion(name);
  if (!suggestion) return res.status(404).json({ found: false, message: "No dosage rule found for this medicine" });
  return res.json({ found: true, suggestion });
};

// GET /api/pharmacy/check-interactions
exports.checkInteractions = (req, res) => {
  const { medicines } = req.body;
  if (!Array.isArray(medicines) || medicines.length === 0)
    return res.status(400).json({ error: "medicines array required" });
  const interactions = checkInteractions(medicines);
  return res.json({ interactions, count: interactions.length });
};

// POST /api/pharmacy/prescriptions — Create prescription + medicines
exports.createPrescription = async (req, res) => {
  try {
    const {
      patient_id, patient_name, doctor_name, department,
      diagnosis, notes, medicines = [],
    } = req.body;

    if (!patient_id || !patient_name)
      return res.status(400).json({ error: "patient_id and patient_name required" });

    const prescription_id = generateRxId();

    // Build temporary prescription object for QR
    const tempRx = { prescription_id, patient_id, patient_name, doctor_name, diagnosis };
    const qr_payload = buildQRPayload(tempRx, medicines);

    // Create prescription record
    const prescription = await createPrescription({
      prescription_id, patient_id, patient_name, doctor_name,
      department, diagnosis, notes, qr_payload,
    });

    // Add medicines
    const savedMeds = [];
    for (const med of medicines) {
      const suggestion = getDosageSuggestion(med.medicine_name);
      const interactions = med.interactions || [];

      const saved = await addMedicine({
        prescription_id,
        medicine_name:   med.medicine_name,
        generic_name:    med.generic_name   || "",
        category:        med.category       || "",
        dosage_strength: med.dosage_strength || suggestion?.standard || "",
        dosage_form:     med.dosage_form    || suggestion?.form      || "Tablet",
        frequency:       med.frequency      || suggestion?.frequency || "",
        duration:        med.duration       || suggestion?.duration  || "",
        duration_days:   med.duration_days  || null,
        timing:          med.timing         || suggestion?.timing    || "",
        route:           med.route          || suggestion?.route     || "Oral",
        quantity:        med.quantity       || null,
        refills:         med.refills        || 0,
        instructions:    med.instructions   || "",
        warnings:        med.warnings       || suggestion?.warnings  || [],
        interactions,
      });
      savedMeds.push(saved);
    }

    // Check for interactions across all medicines
    const detectedInteractions = checkInteractions(
      medicines.map((m) => ({ medicine_name: m.medicine_name }))
    );

    return res.status(201).json({
      success: true,
      prescription: { ...prescription, medicines: savedMeds },
      qr_payload,
      interactions: detectedInteractions,
    });
  } catch (err) {
    console.error("createPrescription error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/pharmacy/prescriptions — All prescriptions
exports.getAllPrescriptions = async (req, res) => {
  try {
    const prescriptions = await getAllPrescriptions();
    return res.json({ prescriptions, total: prescriptions.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/pharmacy/prescriptions/patient/:patientId
exports.getByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const prescriptions = await getPrescriptionsByPatient(patientId);
    return res.json({ prescriptions, total: prescriptions.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/pharmacy/prescriptions/:rxId
exports.getPrescriptionById = async (req, res) => {
  try {
    const rx = await getPrescriptionById(req.params.rxId);
    if (!rx) return res.status(404).json({ error: "Prescription not found" });
    return res.json(rx);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PATCH /api/pharmacy/prescriptions/:rxId/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["Active", "Dispensed", "Cancelled", "Expired"];
    if (!allowed.includes(status))
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
    const updated = await updatePrescriptionStatus(req.params.rxId, status);
    if (!updated) return res.status(404).json({ error: "Prescription not found" });
    return res.json({ success: true, prescription: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/pharmacy/prescriptions/:rxId
exports.deletePrescription = async (req, res) => {
  try {
    await deletePrescription(req.params.rxId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/pharmacy/medicines/:medicineId
exports.deletePrescriptionMedicine = async (req, res) => {
  try {
    await deleteMedicine(req.params.medicineId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/pharmacy/drug-list — Return known drugs for autocomplete
exports.getDrugList = (req, res) => {
  const drugs = Object.keys(DOSAGE_RULES).map((name) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    ...DOSAGE_RULES[name],
  }));
  return res.json({ drugs });
};
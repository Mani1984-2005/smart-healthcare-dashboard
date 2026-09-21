// Part 4 — curated reference tables used by the deterministic rules.
//
// IMPORTANT: this is a small, hand-curated DEMO rule set for the hackathon. It has NOT been clinically
// validated and is not a substitute for a licensed drug database or local clinical protocols.
// Every finding derived from these tables says so. Extend or replace via this single file.

export const RULESET = Object.freeze({
  id: "sih2026-part4-demo-rules",
  version: "0.1.0",
  status: "demo — not clinically validated",
});

// ---- Symptom vocabulary: canonical tag -> accepted phrases (matched against structured symptom names) ----
export const SYMPTOM_SYNONYMS = {
  chest_pain: ["chest pain", "chest tightness", "chest discomfort", "chest pressure", "angina"],
  dyspnea: ["breathlessness", "shortness of breath", "dyspnea", "dyspnoea", "difficulty breathing", "sob"],
  diaphoresis: ["sweating", "diaphoresis", "cold sweat", "profuse sweating"],
  radiating_pain: ["pain radiating to arm", "pain radiating to jaw", "left arm pain", "jaw pain", "radiation to left arm"],
  nausea: ["nausea", "vomiting"],
  syncope: ["syncope", "fainting", "collapse", "loss of consciousness", "blackout"],
  facial_droop: ["facial droop", "face drooping", "facial weakness"],
  slurred_speech: ["slurred speech", "difficulty speaking", "speech difficulty"],
  unilateral_weakness: ["unilateral weakness", "one-sided weakness", "arm weakness", "leg weakness", "hemiparesis"],
  sudden_vision_loss: ["sudden vision loss", "sudden loss of vision"],
  thunderclap_headache: ["thunderclap headache", "sudden severe headache", "worst headache of life"],
  confusion: ["confusion", "altered mental status", "disorientation", "new confusion"],
  neck_stiffness: ["neck stiffness", "stiff neck"],
  fever: ["fever", "high fever", "low grade fever", "low-grade fever", "high temperature", "pyrexia"],
  cough: ["cough", "dry cough", "persistent cough"],
  sputum: ["sputum", "productive cough", "phlegm"],
  hematemesis: ["hematemesis", "haematemesis", "vomiting blood", "blood in vomit"],
  melena: ["melena", "melaena", "black stool", "black tarry stool"],
  rectal_bleeding: ["rectal bleeding", "blood in stool", "bloody stool"],
  dysuria: ["dysuria", "painful urination", "burning urination"],
  urinary_frequency: ["urinary frequency", "frequent urination"],
  flank_pain: ["flank pain", "loin pain", "suprapubic pain"],
  polyuria: ["polyuria", "excessive urination"],
  polydipsia: ["polydipsia", "excessive thirst", "increased thirst"],
  fatigue: ["fatigue", "tiredness", "weakness", "lethargy"],
  weight_loss: ["weight loss", "unintentional weight loss"],
  blurred_vision: ["blurred vision", "blurry vision"],
  pallor: ["pallor", "pale skin"],
};

// ---- Adult vital-sign thresholds (single-parameter EXTREME bands) ----
// Adapted from the score-3 extreme bands used in NEWS2-style early-warning charts; values are configurable
// demo values, NOT clinically validated, and NOT a scored NEWS2 (no total is computed).
export const VITAL_THRESHOLDS = {
  spo2: [{ op: "lte", value: 91, unit: "%", label: "Low oxygen saturation", urgency: "immediate_review",
    caveat: "Target saturation differs for patients with documented chronic hypercapnic respiratory failure; the clinician must interpret in context." }],
  respiratoryRate: [
    { op: "gte", value: 25, unit: "breaths/min", label: "High respiratory rate", urgency: "immediate_review" },
    { op: "lte", value: 8, unit: "breaths/min", label: "Low respiratory rate", urgency: "immediate_review" },
  ],
  systolicBp: [
    { op: "lte", value: 90, unit: "mmHg", label: "Low systolic blood pressure", urgency: "immediate_review" },
    { op: "gte", value: 220, unit: "mmHg", label: "Very high systolic blood pressure", urgency: "immediate_review" },
    { op: "gte", value: 180, unit: "mmHg", label: "Severely elevated systolic blood pressure", urgency: "prompt_review" },
  ],
  diastolicBp: [{ op: "gte", value: 120, unit: "mmHg", label: "Severely elevated diastolic blood pressure", urgency: "prompt_review" }],
  heartRate: [
    { op: "gte", value: 131, unit: "bpm", label: "Very high heart rate", urgency: "immediate_review" },
    { op: "lte", value: 40, unit: "bpm", label: "Very low heart rate", urgency: "immediate_review" },
  ],
  temperature: [
    { op: "gte", value: 39.1, unit: "°C", label: "High temperature", urgency: "prompt_review" },
    { op: "lte", value: 35.0, unit: "°C", label: "Low temperature", urgency: "immediate_review" },
  ],
};

export const VITAL_UNIT_ALIASES = {
  temperature: { "°c": "°C", c: "°C", celsius: "°C", "°f": "°F", f: "°F", fahrenheit: "°F" },
  heartRate: { bpm: "bpm", "/min": "bpm", "beats/min": "bpm" },
  systolicBp: { mmhg: "mmHg" },
  diastolicBp: { mmhg: "mmHg" },
  respiratoryRate: { "breaths/min": "breaths/min", "/min": "breaths/min", rpm: "breaths/min" },
  spo2: { "%": "%" },
};

// Physiologically plausible bounds (canonical units). Values outside are treated as probable entry errors
// and are NOT evaluated by any rule.
export const VITAL_PLAUSIBLE = {
  temperature: [25, 45],
  heartRate: [20, 300],
  systolicBp: [40, 300],
  diastolicBp: [20, 200],
  respiratoryRate: [4, 80],
  spo2: [40, 100],
};

// ---- Brand -> generic(s). Only brands the maintainers are confident about. ----
export const BRAND_ALIASES = {
  crocin: ["paracetamol"],
  dolo: ["paracetamol"],
  ecosprin: ["aspirin"],
  glycomet: ["metformin"],
  augmentin: ["amoxicillin", "clavulanic acid"],
  brufen: ["ibuprofen"],
  combiflam: ["ibuprofen", "paracetamol"],
  amaryl: ["glimepiride"],
  "amoxicillin-clavulanate": ["amoxicillin", "clavulanic acid"],
  "amoxicillin/clavulanate": ["amoxicillin", "clavulanic acid"],
  "co-amoxiclav": ["amoxicillin", "clavulanic acid"],
  "co-trimoxazole": ["sulfamethoxazole", "trimethoprim"],
};

// ---- Drug classes (ingredient -> class) ----
export const DRUG_CLASSES = {
  penicillin: ["penicillin", "amoxicillin", "ampicillin", "piperacillin", "flucloxacillin", "cloxacillin", "benzylpenicillin"],
  cephalosporin: ["cefalexin", "cephalexin", "cefuroxime", "ceftriaxone", "cefixime", "cefpodoxime", "cefazolin"],
  nsaid: ["ibuprofen", "diclofenac", "naproxen", "ketorolac", "aspirin", "mefenamic acid", "indomethacin", "piroxicam"],
  sulfonamide_antibiotic: ["sulfamethoxazole", "sulfadiazine", "sulfasalazine"],
  macrolide: ["erythromycin", "azithromycin", "clarithromycin"],
  fluoroquinolone: ["ciprofloxacin", "levofloxacin", "ofloxacin", "moxifloxacin"],
  opioid: ["morphine", "codeine", "tramadol", "fentanyl", "oxycodone"],
  benzodiazepine: ["diazepam", "lorazepam", "alprazolam", "clonazepam"],
  ace_inhibitor: ["lisinopril", "enalapril", "ramipril", "perindopril", "captopril"],
  statin: ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin"],
  ppi: ["omeprazole", "pantoprazole", "esomeprazole", "lansoprazole", "rabeprazole"],
  ssri: ["fluoxetine", "sertraline", "escitalopram", "citalopram", "paroxetine"],
  beta_blocker: ["metoprolol", "atenolol", "bisoprolol", "propranolol"],
  nitrate: ["isosorbide mononitrate", "isosorbide dinitrate", "glyceryl trinitrate", "nitroglycerin"],
  potassium_sparing: ["spironolactone", "eplerenone", "amiloride", "triamterene"],
};

// Allergy phrases that name a class rather than a single drug.
export const ALLERGY_CLASS_ALIASES = {
  penicillin: "penicillin", penicillins: "penicillin", "penicillin group": "penicillin", "beta-lactam": "penicillin",
  nsaid: "nsaid", nsaids: "nsaid", "anti-inflammatory": "nsaid", "anti-inflammatories": "nsaid",
  sulfa: "sulfonamide_antibiotic", "sulfa drugs": "sulfonamide_antibiotic", sulphonamide: "sulfonamide_antibiotic",
  sulfonamides: "sulfonamide_antibiotic", "sulpha drugs": "sulfonamide_antibiotic",
  cephalosporin: "cephalosporin", cephalosporins: "cephalosporin",
  macrolide: "macrolide", macrolides: "macrolide",
  quinolone: "fluoroquinolone", quinolones: "fluoroquinolone", fluoroquinolone: "fluoroquinolone", fluoroquinolones: "fluoroquinolone",
  opioid: "opioid", opioids: "opioid",
};

// Documented class-level relationships where cross-reactivity is possible but not certain.
export const ALLERGY_RELATED_CLASSES = { penicillin: ["cephalosporin"] };

// Classes where taking two active agents is a possible therapeutic duplication.
export const DUPLICATION_CLASSES = ["nsaid", "ppi", "statin", "ace_inhibitor", "ssri", "beta_blocker", "benzodiazepine", "opioid"];

// ---- Interaction rules. `a`/`b` are ingredient names or class names (class:xxx). ----
export const INTERACTIONS = [
  { id: "warfarin-nsaid", a: "warfarin", b: "class:nsaid", severity: "high",
    rationale: "Combined use is associated with a higher risk of bleeding (including gastrointestinal bleeding)." },
  { id: "warfarin-macrolide", a: "warfarin", b: "class:macrolide", severity: "moderate",
    rationale: "Some macrolides can raise INR in patients taking warfarin." },
  { id: "warfarin-fluoroquinolone", a: "warfarin", b: "class:fluoroquinolone", severity: "moderate",
    rationale: "Fluoroquinolones can increase the anticoagulant effect of warfarin." },
  { id: "warfarin-metronidazole", a: "warfarin", b: "metronidazole", severity: "high",
    rationale: "Metronidazole can markedly increase INR in patients taking warfarin." },
  { id: "simvastatin-clarithromycin", a: "simvastatin", b: "clarithromycin", severity: "high",
    rationale: "Clarithromycin raises simvastatin exposure, increasing the risk of myopathy/rhabdomyolysis; product labelling advises against the combination." },
  { id: "simvastatin-amlodipine", a: "simvastatin", b: "amlodipine", severity: "moderate",
    rationale: "Product labelling limits the simvastatin dose when co-prescribed with amlodipine." },
  { id: "acei-potassium-sparing", a: "class:ace_inhibitor", b: "class:potassium_sparing", severity: "moderate",
    rationale: "Combined use can cause hyperkalaemia; electrolyte and renal monitoring is usually needed." },
  { id: "acei-potassium-supplement", a: "class:ace_inhibitor", b: "potassium chloride", severity: "moderate",
    rationale: "Potassium supplementation with an ACE inhibitor can cause hyperkalaemia." },
  { id: "acei-nsaid", a: "class:ace_inhibitor", b: "class:nsaid", severity: "moderate",
    rationale: "NSAIDs can blunt the antihypertensive effect of ACE inhibitors and may worsen renal function." },
  { id: "ssri-nsaid", a: "class:ssri", b: "class:nsaid", severity: "moderate",
    rationale: "Combined use is associated with an increased risk of bleeding." },
  { id: "ssri-tramadol", a: "class:ssri", b: "tramadol", severity: "high",
    rationale: "Combined use increases the risk of serotonin syndrome and seizures." },
  { id: "clopidogrel-ppi", a: "clopidogrel", b: "omeprazole", severity: "moderate",
    rationale: "Omeprazole can reduce activation of clopidogrel (CYP2C19); product labelling advises avoiding the combination." },
  { id: "betablocker-verapamil", a: "class:beta_blocker", b: "verapamil", severity: "high",
    rationale: "Additive effects on heart rate and AV conduction can cause severe bradycardia or heart block." },
  { id: "betablocker-diltiazem", a: "class:beta_blocker", b: "diltiazem", severity: "high",
    rationale: "Additive effects on heart rate and AV conduction can cause severe bradycardia or heart block." },
  { id: "sildenafil-nitrate", a: "sildenafil", b: "class:nitrate", severity: "high",
    rationale: "Combined use can cause profound hypotension; the combination is contraindicated in product labelling." },
  { id: "methotrexate-trimethoprim", a: "methotrexate", b: "trimethoprim", severity: "high",
    rationale: "Combined use increases the risk of bone-marrow suppression." },
  { id: "opioid-benzodiazepine", a: "class:opioid", b: "class:benzodiazepine", severity: "high",
    rationale: "Combined use increases the risk of profound sedation and respiratory depression." },
];

// ---- Canonical test keys used by rules (matched against lower-cased investigation names) ----
export const TEST_ALIASES = {
  hemoglobin: ["hemoglobin", "haemoglobin", "hb", "hgb"],
  mcv: ["mcv", "mean corpuscular volume"],
  wbc: ["wbc", "white blood cell count", "white cell count", "tlc", "total leucocyte count"],
  crp: ["crp", "c-reactive protein"],
  glucose: ["glucose", "fasting glucose", "fasting blood glucose", "random blood glucose", "blood glucose", "fbs"],
  hba1c: ["hba1c", "glycated hemoglobin", "glycosylated hemoglobin", "a1c"],
  creatinine: ["creatinine", "serum creatinine"],
  egfr: ["egfr", "estimated gfr", "estimated glomerular filtration rate"],
  potassium: ["potassium", "serum potassium", "k+"],
  inr: ["inr"],
  ferritin: ["ferritin"],
};

export const EGFR_UNIT_ALIASES = ["ml/min/1.73m2", "ml/min/1.73m²", "ml/min/1.73 m2", "ml/min/1.73 m²"];

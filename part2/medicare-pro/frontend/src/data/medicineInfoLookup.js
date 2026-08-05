// =========================================================
// MEDICARE PRO — Frontend medicine info lookup (Part 2: AI Intelligence)
// =========================================================
// Mirrors the display-relevant fields of the backend's offline medicine
// knowledge base (backend/src/data/medicineDatabase.js), keyed by the
// same stable id used in AI analysis results (medicine.medicineKey /
// medicine.medicineId). Used purely for client-side display of side
// effects / precautions / contraindications without an extra API round
// trip. Keep in sync with the backend KB when medicines are added there.

export const MEDICINE_INFO = [
  {
    "id": "paracetamol",
    "genericName": "Paracetamol",
    "brandNames": [
      "Tylenol",
      "Crocin",
      "Calpol",
      "Dolo",
      "Panadol"
    ],
    "category": "Analgesic / Antipyretic",
    "dosageForms": [
      "tablet",
      "syrup",
      "IV"
    ],
    "indications": [
      "Fever",
      "Mild to moderate pain"
    ],
    "sideEffects": [
      "Nausea",
      "Rash (rare)",
      "Liver toxicity in overdose"
    ],
    "precautions": [
      "Do not exceed 4g/day",
      "Use caution with liver disease",
      "Avoid with heavy alcohol use"
    ],
    "contraindications": [
      "Severe hepatic impairment"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "ibuprofen",
    "genericName": "Ibuprofen",
    "brandNames": [
      "Brufen",
      "Advil",
      "Motrin"
    ],
    "category": "NSAID",
    "dosageForms": [
      "tablet",
      "syrup"
    ],
    "indications": [
      "Pain",
      "Inflammation",
      "Fever"
    ],
    "sideEffects": [
      "GI upset",
      "Heartburn",
      "Dizziness",
      "Fluid retention"
    ],
    "precautions": [
      "Take with food",
      "Avoid in peptic ulcer disease",
      "Use lowest effective dose"
    ],
    "contraindications": [
      "Active GI bleed",
      "Severe renal impairment",
      "Third trimester pregnancy"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "aspirin",
    "genericName": "Aspirin",
    "brandNames": [
      "Ecosprin",
      "Disprin",
      "Bayer"
    ],
    "category": "NSAID / Antiplatelet",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Cardiovascular prophylaxis",
      "Pain",
      "Fever"
    ],
    "sideEffects": [
      "GI upset",
      "Bleeding risk",
      "Tinnitus at high dose"
    ],
    "precautions": [
      "Take with food",
      "Monitor for bleeding"
    ],
    "contraindications": [
      "Active peptic ulcer",
      "Bleeding disorders",
      "Children with viral illness (Reye syndrome risk)"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "amoxicillin",
    "genericName": "Amoxicillin",
    "brandNames": [
      "Amoxil",
      "Novamox",
      "Mox"
    ],
    "category": "Antibiotic (Penicillin)",
    "dosageForms": [
      "capsule",
      "syrup"
    ],
    "indications": [
      "Bacterial infections (respiratory, ENT, UTI)"
    ],
    "sideEffects": [
      "Diarrhea",
      "Nausea",
      "Rash",
      "Allergic reaction"
    ],
    "precautions": [
      "Complete the full course",
      "Take with or without food"
    ],
    "contraindications": [
      "Known penicillin allergy"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "amoxicillin_clavulanate",
    "genericName": "Amoxicillin-Clavulanate",
    "brandNames": [
      "Augmentin",
      "Clavam",
      "Moxikind-CV"
    ],
    "category": "Antibiotic (Penicillin + Beta-lactamase inhibitor)",
    "dosageForms": [
      "tablet",
      "syrup"
    ],
    "indications": [
      "Bacterial infections resistant to plain amoxicillin"
    ],
    "sideEffects": [
      "Diarrhea",
      "Nausea",
      "Rash",
      "Hepatotoxicity (rare)"
    ],
    "precautions": [
      "Take with food to reduce GI upset",
      "Complete the full course"
    ],
    "contraindications": [
      "Known penicillin allergy",
      "History of amoxicillin-clavulanate related jaundice"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "azithromycin",
    "genericName": "Azithromycin",
    "brandNames": [
      "Zithromax",
      "Azithral",
      "Azee"
    ],
    "category": "Antibiotic (Macrolide)",
    "dosageForms": [
      "tablet",
      "syrup"
    ],
    "indications": [
      "Respiratory, ENT and skin infections"
    ],
    "sideEffects": [
      "GI upset",
      "QT prolongation (rare)",
      "Diarrhea"
    ],
    "precautions": [
      "Caution with pre-existing cardiac arrhythmia"
    ],
    "contraindications": [
      "Known macrolide allergy",
      "History of cholestatic jaundice with azithromycin"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "clarithromycin",
    "genericName": "Clarithromycin",
    "brandNames": [
      "Biaxin",
      "Claribid"
    ],
    "category": "Antibiotic (Macrolide)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Respiratory infections",
      "H. pylori eradication"
    ],
    "sideEffects": [
      "GI upset",
      "Taste disturbance",
      "QT prolongation"
    ],
    "precautions": [
      "Strong CYP3A4 inhibitor — review co-medications"
    ],
    "contraindications": [
      "Known macrolide allergy",
      "Concurrent ergotamine use"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "ciprofloxacin",
    "genericName": "Ciprofloxacin",
    "brandNames": [
      "Cipro",
      "Ciplox"
    ],
    "category": "Antibiotic (Fluoroquinolone)",
    "dosageForms": [
      "tablet",
      "IV"
    ],
    "indications": [
      "UTI",
      "GI infections",
      "Respiratory infections"
    ],
    "sideEffects": [
      "Tendon rupture risk",
      "GI upset",
      "QT prolongation",
      "CNS effects"
    ],
    "precautions": [
      "Avoid in tendon disorders",
      "Avoid concurrent dairy/antacids (reduced absorption)"
    ],
    "contraindications": [
      "Known fluoroquinolone allergy",
      "Myasthenia gravis"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "metronidazole",
    "genericName": "Metronidazole",
    "brandNames": [
      "Flagyl",
      "Metrogyl"
    ],
    "category": "Antibiotic (Nitroimidazole)",
    "dosageForms": [
      "tablet",
      "IV"
    ],
    "indications": [
      "Anaerobic and protozoal infections"
    ],
    "sideEffects": [
      "Metallic taste",
      "Nausea",
      "Peripheral neuropathy (prolonged use)"
    ],
    "precautions": [
      "Avoid alcohol during and 48h after treatment (disulfiram-like reaction)"
    ],
    "contraindications": [
      "First trimester pregnancy",
      "Known metronidazole allergy"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "doxycycline",
    "genericName": "Doxycycline",
    "brandNames": [
      "Vibramycin",
      "Doxy-1"
    ],
    "category": "Antibiotic (Tetracycline)",
    "dosageForms": [
      "capsule",
      "tablet"
    ],
    "indications": [
      "Respiratory infections",
      "Acne",
      "Tick-borne illness"
    ],
    "sideEffects": [
      "Photosensitivity",
      "GI upset",
      "Esophageal irritation"
    ],
    "precautions": [
      "Take with plenty of water while upright",
      "Avoid sun exposure"
    ],
    "contraindications": [
      "Pregnancy",
      "Children under 8 years",
      "Known tetracycline allergy"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "metformin",
    "genericName": "Metformin",
    "brandNames": [
      "Glucophage",
      "Glycomet",
      "Obimet"
    ],
    "category": "Antidiabetic (Biguanide)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Type 2 diabetes mellitus"
    ],
    "sideEffects": [
      "GI upset",
      "Diarrhea",
      "Vitamin B12 deficiency (long-term)",
      "Lactic acidosis (rare)"
    ],
    "precautions": [
      "Take with food",
      "Hold before contrast imaging",
      "Monitor renal function"
    ],
    "contraindications": [
      "Severe renal impairment (eGFR < 30)",
      "Acute heart failure",
      "Metabolic acidosis"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "glimepiride",
    "genericName": "Glimepiride",
    "brandNames": [
      "Amaryl",
      "Glimy"
    ],
    "category": "Antidiabetic (Sulfonylurea)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Type 2 diabetes mellitus"
    ],
    "sideEffects": [
      "Hypoglycemia",
      "Weight gain",
      "GI upset"
    ],
    "precautions": [
      "Take with breakfast",
      "Monitor blood glucose closely"
    ],
    "contraindications": [
      "Type 1 diabetes",
      "Diabetic ketoacidosis",
      "Known sulfa allergy"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "insulin_glargine",
    "genericName": "Insulin Glargine",
    "brandNames": [
      "Lantus",
      "Basalog"
    ],
    "category": "Antidiabetic (Long-acting insulin)",
    "dosageForms": [
      "injection"
    ],
    "indications": [
      "Type 1 and Type 2 diabetes mellitus"
    ],
    "sideEffects": [
      "Hypoglycemia",
      "Injection site reaction",
      "Weight gain"
    ],
    "precautions": [
      "Rotate injection sites",
      "Monitor blood glucose closely",
      "Never share pens/needles"
    ],
    "contraindications": [
      "Episodes of hypoglycemia unawareness without monitoring plan"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "lisinopril",
    "genericName": "Lisinopril",
    "brandNames": [
      "Zestril",
      "Prinivil"
    ],
    "category": "Antihypertensive (ACE inhibitor)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Hypertension",
      "Heart failure"
    ],
    "sideEffects": [
      "Dry cough",
      "Hyperkalemia",
      "Dizziness",
      "Angioedema (rare)"
    ],
    "precautions": [
      "Monitor potassium and renal function",
      "Rise slowly to avoid orthostatic hypotension"
    ],
    "contraindications": [
      "Pregnancy",
      "History of ACE-inhibitor angioedema",
      "Bilateral renal artery stenosis"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "losartan",
    "genericName": "Losartan",
    "brandNames": [
      "Cozaar",
      "Losar"
    ],
    "category": "Antihypertensive (ARB)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Hypertension",
      "Diabetic nephropathy"
    ],
    "sideEffects": [
      "Dizziness",
      "Hyperkalemia",
      "Fatigue"
    ],
    "precautions": [
      "Monitor potassium and renal function"
    ],
    "contraindications": [
      "Pregnancy",
      "Bilateral renal artery stenosis"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "amlodipine",
    "genericName": "Amlodipine",
    "brandNames": [
      "Norvasc",
      "Amlopres",
      "Amlong"
    ],
    "category": "Antihypertensive (Calcium channel blocker)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Hypertension",
      "Angina"
    ],
    "sideEffects": [
      "Ankle edema",
      "Flushing",
      "Headache",
      "Dizziness"
    ],
    "precautions": [
      "Rise slowly to avoid orthostatic hypotension"
    ],
    "contraindications": [
      "Severe aortic stenosis",
      "Cardiogenic shock"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "atenolol",
    "genericName": "Atenolol",
    "brandNames": [
      "Tenormin",
      "Aten"
    ],
    "category": "Antihypertensive (Beta-blocker)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Hypertension",
      "Angina",
      "Arrhythmia"
    ],
    "sideEffects": [
      "Fatigue",
      "Bradycardia",
      "Cold extremities",
      "Bronchospasm (caution in asthma)"
    ],
    "precautions": [
      "Do not stop abruptly",
      "Caution in asthma/COPD"
    ],
    "contraindications": [
      "Severe bradycardia",
      "Decompensated heart failure",
      "Severe asthma"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "furosemide",
    "genericName": "Furosemide",
    "brandNames": [
      "Lasix",
      "Frusenex"
    ],
    "category": "Diuretic (Loop)",
    "dosageForms": [
      "tablet",
      "IV"
    ],
    "indications": [
      "Edema",
      "Heart failure",
      "Hypertension"
    ],
    "sideEffects": [
      "Hypokalemia",
      "Dehydration",
      "Hypotension",
      "Ototoxicity at high dose"
    ],
    "precautions": [
      "Monitor electrolytes and renal function"
    ],
    "contraindications": [
      "Anuria",
      "Severe electrolyte depletion"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "spironolactone",
    "genericName": "Spironolactone",
    "brandNames": [
      "Aldactone"
    ],
    "category": "Diuretic (Potassium-sparing)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Heart failure",
      "Edema",
      "Hyperaldosteronism"
    ],
    "sideEffects": [
      "Hyperkalemia",
      "Gynecomastia",
      "Menstrual irregularities"
    ],
    "precautions": [
      "Monitor potassium closely, especially with ACE inhibitors/ARBs"
    ],
    "contraindications": [
      "Hyperkalemia",
      "Addison disease",
      "Severe renal impairment"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "atorvastatin",
    "genericName": "Atorvastatin",
    "brandNames": [
      "Lipitor",
      "Atorva"
    ],
    "category": "Lipid-lowering (Statin)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Hypercholesterolemia",
      "Cardiovascular risk reduction"
    ],
    "sideEffects": [
      "Myalgia",
      "Elevated liver enzymes",
      "Rhabdomyolysis (rare)"
    ],
    "precautions": [
      "Monitor liver enzymes",
      "Report unexplained muscle pain"
    ],
    "contraindications": [
      "Active liver disease",
      "Pregnancy"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "simvastatin",
    "genericName": "Simvastatin",
    "brandNames": [
      "Zocor"
    ],
    "category": "Lipid-lowering (Statin)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Hypercholesterolemia",
      "Cardiovascular risk reduction"
    ],
    "sideEffects": [
      "Myalgia",
      "Elevated liver enzymes",
      "Rhabdomyolysis (rare)"
    ],
    "precautions": [
      "Take in the evening",
      "Report unexplained muscle pain"
    ],
    "contraindications": [
      "Active liver disease",
      "Concurrent strong CYP3A4 inhibitors at high dose"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "warfarin",
    "genericName": "Warfarin",
    "brandNames": [
      "Coumadin"
    ],
    "category": "Anticoagulant",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Atrial fibrillation",
      "Venous thromboembolism",
      "Mechanical heart valve"
    ],
    "sideEffects": [
      "Bleeding",
      "Bruising"
    ],
    "precautions": [
      "Regular INR monitoring required",
      "Consistent vitamin K intake",
      "Numerous drug/food interactions"
    ],
    "contraindications": [
      "Active bleeding",
      "Pregnancy",
      "Severe hepatic disease"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "clopidogrel",
    "genericName": "Clopidogrel",
    "brandNames": [
      "Plavix"
    ],
    "category": "Antiplatelet",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Post-MI/stroke prophylaxis",
      "Post-stent placement"
    ],
    "sideEffects": [
      "Bleeding",
      "Bruising",
      "GI upset"
    ],
    "precautions": [
      "Do not stop abruptly, especially post-stent",
      "Report unusual bleeding"
    ],
    "contraindications": [
      "Active bleeding",
      "Severe hepatic impairment"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "digoxin",
    "genericName": "Digoxin",
    "brandNames": [
      "Lanoxin"
    ],
    "category": "Cardiac glycoside",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Heart failure",
      "Atrial fibrillation rate control"
    ],
    "sideEffects": [
      "Nausea",
      "Visual disturbances",
      "Arrhythmia at toxic levels"
    ],
    "precautions": [
      "Narrow therapeutic index — monitor levels and potassium"
    ],
    "contraindications": [
      "Ventricular fibrillation",
      "Hypertrophic cardiomyopathy"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "verapamil",
    "genericName": "Verapamil",
    "brandNames": [
      "Calan",
      "Isoptin"
    ],
    "category": "Antihypertensive (Calcium channel blocker)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Hypertension",
      "Arrhythmia",
      "Angina"
    ],
    "sideEffects": [
      "Constipation",
      "Bradycardia",
      "Hypotension"
    ],
    "precautions": [
      "Avoid with pre-existing bradycardia"
    ],
    "contraindications": [
      "Severe left ventricular dysfunction",
      "Sick sinus syndrome"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "omeprazole",
    "genericName": "Omeprazole",
    "brandNames": [
      "Prilosec",
      "Omez"
    ],
    "category": "Proton Pump Inhibitor",
    "dosageForms": [
      "capsule"
    ],
    "indications": [
      "GERD",
      "Peptic ulcer disease"
    ],
    "sideEffects": [
      "Headache",
      "GI upset",
      "Long-term B12/magnesium deficiency"
    ],
    "precautions": [
      "Take before meals",
      "Reassess long-term use periodically"
    ],
    "contraindications": [
      "Known hypersensitivity to PPIs"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "pantoprazole",
    "genericName": "Pantoprazole",
    "brandNames": [
      "Protonix",
      "Pantocid"
    ],
    "category": "Proton Pump Inhibitor",
    "dosageForms": [
      "tablet",
      "IV"
    ],
    "indications": [
      "GERD",
      "Peptic ulcer disease"
    ],
    "sideEffects": [
      "Headache",
      "GI upset"
    ],
    "precautions": [
      "Take before meals"
    ],
    "contraindications": [
      "Known hypersensitivity to PPIs"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "ranitidine",
    "genericName": "Ranitidine",
    "brandNames": [
      "Zantac"
    ],
    "category": "H2 Blocker",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "GERD",
      "Peptic ulcer disease"
    ],
    "sideEffects": [
      "Headache",
      "Dizziness"
    ],
    "precautions": [
      "Withdrawn/restricted in several markets — confirm local availability"
    ],
    "contraindications": [
      "Known hypersensitivity"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "cetirizine",
    "genericName": "Cetirizine",
    "brandNames": [
      "Zyrtec",
      "Alerid"
    ],
    "category": "Antihistamine",
    "dosageForms": [
      "tablet",
      "syrup"
    ],
    "indications": [
      "Allergic rhinitis",
      "Urticaria"
    ],
    "sideEffects": [
      "Drowsiness",
      "Dry mouth"
    ],
    "precautions": [
      "Use caution when driving until effect known"
    ],
    "contraindications": [
      "Severe renal impairment (dose adjust)"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "montelukast",
    "genericName": "Montelukast",
    "brandNames": [
      "Singulair"
    ],
    "category": "Leukotriene receptor antagonist",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Asthma",
      "Allergic rhinitis"
    ],
    "sideEffects": [
      "Headache",
      "Mood changes (rare)"
    ],
    "precautions": [
      "Monitor for neuropsychiatric symptoms"
    ],
    "contraindications": [
      "Known hypersensitivity"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "salbutamol",
    "genericName": "Salbutamol",
    "brandNames": [
      "Ventolin",
      "Asthalin"
    ],
    "category": "Bronchodilator (SABA)",
    "dosageForms": [
      "inhaler",
      "nebulizer solution",
      "tablet"
    ],
    "indications": [
      "Asthma",
      "COPD",
      "Bronchospasm"
    ],
    "sideEffects": [
      "Tremor",
      "Tachycardia",
      "Nervousness"
    ],
    "precautions": [
      "Overuse indicates poor asthma control — reassess therapy"
    ],
    "contraindications": [
      "Known hypersensitivity"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "prednisolone",
    "genericName": "Prednisolone",
    "brandNames": [
      "Wysolone",
      "Omnacortil"
    ],
    "category": "Corticosteroid",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Inflammatory and autoimmune conditions",
      "Severe allergic reactions",
      "Asthma exacerbation"
    ],
    "sideEffects": [
      "Weight gain",
      "Hyperglycemia",
      "Mood changes",
      "Osteoporosis (long-term)",
      "Immunosuppression"
    ],
    "precautions": [
      "Do not stop abruptly after prolonged use — taper",
      "Monitor blood glucose"
    ],
    "contraindications": [
      "Systemic fungal infection",
      "Uncontrolled infection"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "levothyroxine",
    "genericName": "Levothyroxine",
    "brandNames": [
      "Synthroid",
      "Eltroxin",
      "Thyronorm"
    ],
    "category": "Thyroid hormone replacement",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Hypothyroidism"
    ],
    "sideEffects": [
      "Palpitations",
      "Insomnia",
      "Weight loss if over-dosed"
    ],
    "precautions": [
      "Take on empty stomach, 30-60 min before food",
      "Separate from calcium/iron by 4 hours"
    ],
    "contraindications": [
      "Untreated adrenal insufficiency",
      "Acute MI"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "sertraline",
    "genericName": "Sertraline",
    "brandNames": [
      "Zoloft"
    ],
    "category": "Antidepressant (SSRI)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Depression",
      "Anxiety disorders",
      "OCD"
    ],
    "sideEffects": [
      "Nausea",
      "Insomnia",
      "Sexual dysfunction",
      "Increased bleeding tendency"
    ],
    "precautions": [
      "May take 4-6 weeks for full effect",
      "Do not stop abruptly"
    ],
    "contraindications": [
      "Concurrent MAOI use"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "alprazolam",
    "genericName": "Alprazolam",
    "brandNames": [
      "Xanax",
      "Alprax"
    ],
    "category": "Benzodiazepine",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Anxiety disorders",
      "Panic disorder"
    ],
    "sideEffects": [
      "Drowsiness",
      "Dependence with prolonged use",
      "Memory impairment"
    ],
    "precautions": [
      "Avoid alcohol",
      "Avoid abrupt discontinuation after regular use",
      "Avoid driving until effect known"
    ],
    "contraindications": [
      "Severe respiratory insufficiency",
      "Untreated sleep apnea",
      "Myasthenia gravis"
    ],
    "highRisk": true,
    "controlledSubstance": true
  },
  {
    "id": "tramadol",
    "genericName": "Tramadol",
    "brandNames": [
      "Ultram",
      "Tramazac"
    ],
    "category": "Opioid analgesic",
    "dosageForms": [
      "tablet",
      "capsule"
    ],
    "indications": [
      "Moderate to severe pain"
    ],
    "sideEffects": [
      "Sedation",
      "Nausea",
      "Constipation",
      "Seizure risk at high dose"
    ],
    "precautions": [
      "Avoid alcohol and other sedatives",
      "Risk of dependence"
    ],
    "contraindications": [
      "Concurrent MAOI use",
      "Uncontrolled seizure disorder"
    ],
    "highRisk": true,
    "controlledSubstance": true
  },
  {
    "id": "morphine",
    "genericName": "Morphine",
    "brandNames": [
      "MS Contin"
    ],
    "category": "Opioid analgesic",
    "dosageForms": [
      "tablet",
      "injection"
    ],
    "indications": [
      "Severe pain"
    ],
    "sideEffects": [
      "Respiratory depression",
      "Sedation",
      "Constipation",
      "Dependence"
    ],
    "precautions": [
      "Monitor respiratory rate",
      "Keep naloxone available where clinically indicated"
    ],
    "contraindications": [
      "Respiratory depression",
      "Paralytic ileus"
    ],
    "highRisk": true,
    "controlledSubstance": true
  },
  {
    "id": "methotrexate",
    "genericName": "Methotrexate",
    "brandNames": [
      "Trexall"
    ],
    "category": "Antimetabolite / DMARD",
    "dosageForms": [
      "tablet",
      "injection"
    ],
    "indications": [
      "Rheumatoid arthritis",
      "Psoriasis",
      "Certain cancers"
    ],
    "sideEffects": [
      "Bone marrow suppression",
      "Hepatotoxicity",
      "Mouth ulcers",
      "GI upset"
    ],
    "precautions": [
      "Dosed weekly, not daily — verify frequency carefully",
      "Folic acid supplementation usually co-prescribed",
      "Regular blood count and liver monitoring"
    ],
    "contraindications": [
      "Pregnancy",
      "Significant hepatic or renal impairment",
      "Active infection"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "theophylline",
    "genericName": "Theophylline",
    "brandNames": [
      "Theo-Dur"
    ],
    "category": "Bronchodilator (Methylxanthine)",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Asthma",
      "COPD"
    ],
    "sideEffects": [
      "Nausea",
      "Tachycardia",
      "Seizures at toxic levels"
    ],
    "precautions": [
      "Narrow therapeutic index — monitor levels"
    ],
    "contraindications": [
      "Uncontrolled seizure disorder",
      "Uncontrolled arrhythmia"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "contrast_dye",
    "genericName": "Iodinated Contrast Media",
    "brandNames": [
      "Omnipaque",
      "Iohexol"
    ],
    "category": "Diagnostic contrast agent",
    "dosageForms": [
      "IV"
    ],
    "indications": [
      "CT/angiography imaging enhancement"
    ],
    "sideEffects": [
      "Contrast-induced nephropathy",
      "Allergic reaction"
    ],
    "precautions": [
      "Hold metformin around administration",
      "Ensure adequate hydration"
    ],
    "contraindications": [
      "Known severe contrast allergy without premedication plan"
    ],
    "highRisk": true,
    "controlledSubstance": false
  },
  {
    "id": "oral_contraceptive",
    "genericName": "Ethinylestradiol-Levonorgestrel",
    "brandNames": [
      "Yasmin",
      "Microgynon"
    ],
    "category": "Hormonal contraceptive",
    "dosageForms": [
      "tablet"
    ],
    "indications": [
      "Contraception",
      "Menstrual regulation"
    ],
    "sideEffects": [
      "Nausea",
      "Breakthrough bleeding",
      "VTE risk"
    ],
    "precautions": [
      "Increased clot risk in smokers over 35"
    ],
    "contraindications": [
      "History of VTE",
      "Estrogen-sensitive cancer",
      "Smoking + age > 35"
    ],
    "highRisk": false,
    "controlledSubstance": false
  },
  {
    "id": "vitamin_d3",
    "genericName": "Cholecalciferol (Vitamin D3)",
    "brandNames": [
      "Calcirol",
      "D-Rise"
    ],
    "category": "Vitamin supplement",
    "dosageForms": [
      "tablet",
      "sachet"
    ],
    "indications": [
      "Vitamin D deficiency",
      "Bone health support"
    ],
    "sideEffects": [
      "Hypercalcemia at high chronic doses"
    ],
    "precautions": [
      "Avoid excessive supplementation without monitoring"
    ],
    "contraindications": [
      "Hypercalcemia",
      "Vitamin D toxicity"
    ],
    "highRisk": false,
    "controlledSubstance": false
  }
];

const BY_ID = new Map(MEDICINE_INFO.map((m) => [m.id, m]));

export function getMedicineById(id) {
  return BY_ID.get(id) || null;
}

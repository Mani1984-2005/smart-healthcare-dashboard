// FILE PATH: src/pages/LaboratoryPage.jsx
// MediCare Pro — Laboratory Information System (LIS) v4
// Upgrades: Clinical Interpretation Engine, Professional Lab Language,
//           Trend Architecture, Gender-Specific Ranges, Enhanced Critical Alerts,
//           Hospital-Style View Modal, Enhanced PDF, Color Coding, AI Architecture Stubs

import { useState, useEffect, useCallback, useMemo } from "react";
import { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY   = "lab_tests";
const PATIENTS_KEY  = "patients";

const TEST_CATEGORIES  = ["Blood Test","Urine Test","X-Ray","MRI","CT Scan","ECG","Ultrasound","Biopsy","Culture & Sensitivity","Other"];
const STATUS_OPTIONS   = ["Pending","In Progress","Completed","Cancelled"];
const PRIORITY_OPTIONS = ["Routine","Urgent","Emergency"];

// ─── Professional Severity Language ──────────────────────────────────────────

function getProfessionalStatus(value, ref) {
  const num = Number(value);
  if (value === "" || Number.isNaN(num)) return "Manual Review";
  const range = ref.max === 999 ? ref.max : ref.max;

  const isCritLow  = ref.criticalLow  != null && num < ref.criticalLow;
  const isCritHigh = ref.criticalHigh != null && num > ref.criticalHigh;
  if (isCritLow)  return "Critical Low";
  if (isCritHigh) return "Critical High";

  if (num < ref.min) {
    const pct = ((ref.min - num) / ref.min) * 100;
    if (pct <= 10)  return "Mildly Decreased";
    if (pct <= 25)  return "Moderately Decreased";
    return "Severely Decreased";
  }
  if (num > range) {
    const pct = ((num - range) / range) * 100;
    if (pct <= 10)  return "Borderline Elevated";
    if (pct <= 30)  return "Moderately Elevated";
    return "Markedly Elevated";
  }
  return "Within Normal Limits";
}

// ─── Master Laboratory Library ────────────────────────────────────────────────

const LAB_MASTER_LIBRARY = {
  CBC: {
    label: "Complete Blood Count",
    icon: "🩸",
    sampleType: "Blood (EDTA)",
    tests: {
      Hemoglobin:  { unit:"g/dL",      min:13,    max:17,    criticalLow:7,    criticalHigh:20,    lowText:"Hemoglobin concentration is below the expected reference range. Anemia or blood loss should be considered.",    highText:"Hemoglobin concentration is above the expected reference range. Polycythemia or dehydration may be present.", genderRanges:{ male:{min:13.5,max:17.5}, female:{min:12,max:15.5} }, professionalName:"Hemoglobin" },
      RBC:         { unit:"million/µL", min:4.5,   max:5.9,   criticalLow:2,    criticalHigh:8,     lowText:"Red blood cell count is below reference range. Anemia or chronic blood loss is possible.",                     highText:"Red blood cell count is above reference range. Polycythemia or dehydration is possible.", professionalName:"Red Blood Cell Count" },
      WBC:         { unit:"cells/µL",   min:4000,  max:11000, criticalLow:2000, criticalHigh:30000, lowText:"White blood cell count is below the lower limit of normal. Immunosuppression or bone marrow pathology should be evaluated.", highText:"White blood cell count is above the upper limit of normal. Infection, inflammation, or hematological malignancy should be excluded.", professionalName:"White Blood Cell Count" },
      Neutrophils: { unit:"%",          min:40,    max:75,    criticalLow:null, criticalHigh:null,  lowText:"Neutrophil percentage is below reference range. Viral infection or drug effect possible.",                    highText:"Neutrophil percentage is above reference range. Bacterial infection or physiological stress possible.", professionalName:"Neutrophils" },
      Platelets:   { unit:"lakh/µL",    min:1.5,   max:4.5,   criticalLow:0.5,  criticalHigh:10,    lowText:"Platelet count is below the lower limit of normal. Bleeding risk is elevated. Immediate clinical evaluation is advised.", highText:"Platelet count is above the upper limit of normal. Thrombocytosis, reactive or primary, should be evaluated.", professionalName:"Platelet Count" },
      Hematocrit:  { unit:"%",          min:41,    max:53,    criticalLow:20,   criticalHigh:60,    lowText:"Hematocrit is below reference range. Anemia is suspected.",                                                   highText:"Hematocrit is above reference range. Dehydration or polycythemia is possible.", professionalName:"Hematocrit" },
      MCV:         { unit:"fL",         min:80,    max:100,   criticalLow:60,   criticalHigh:120,   lowText:"Mean corpuscular volume is below reference range. Microcytic process (iron deficiency, thalassemia) is suggested.", highText:"Mean corpuscular volume is above reference range. Macrocytic process (B12/folate deficiency) is suggested.", professionalName:"Mean Corpuscular Volume (MCV)" },
      MCH:         { unit:"pg",         min:27,    max:33,    criticalLow:18,   criticalHigh:40,    lowText:"Mean corpuscular hemoglobin is below reference range. Hypochromic anemia is possible.",                       highText:"Mean corpuscular hemoglobin is above reference range. Macrocytic process is possible.", professionalName:"Mean Corpuscular Hemoglobin (MCH)" },
      MCHC:        { unit:"g/dL",       min:32,    max:36,    criticalLow:25,   criticalHigh:40,    lowText:"Mean corpuscular hemoglobin concentration is below reference range. Hypochromic anemia is indicated.",         highText:"MCHC is above reference range. Spherocytosis or laboratory artifact should be considered.", professionalName:"Mean Corpuscular Hgb Concentration (MCHC)" },
    },
  },

  LFT: {
    label: "Liver Function Test",
    icon: "🫀",
    sampleType: "Blood (Serum)",
    tests: {
      "Bilirubin Total":  { unit:"mg/dL", min:0.1,  max:1.2,  criticalLow:null, criticalHigh:15,   lowText:"Total bilirubin is below reference range. Generally not clinically significant.",   highText:"Total bilirubin is above reference range. Jaundice, haemolytic disease, or hepatocellular pathology should be excluded.", professionalName:"Total Bilirubin" },
      "Bilirubin Direct": { unit:"mg/dL", min:0,    max:0.3,  criticalLow:null, criticalHigh:5,    lowText:"Direct bilirubin is within acceptable limits.",                                      highText:"Direct bilirubin is elevated. Obstructive jaundice or hepatocellular disease is possible.", professionalName:"Direct (Conjugated) Bilirubin" },
      SGOT:              { unit:"U/L",   min:10,   max:40,   criticalLow:null, criticalHigh:1000, lowText:"Serum glutamic-oxaloacetic transaminase is within physiological range.",               highText:"SGOT/AST is elevated. Hepatocellular injury, myocardial infarction, or skeletal muscle damage should be evaluated.", professionalName:"SGOT / AST" },
      SGPT:              { unit:"U/L",   min:7,    max:56,   criticalLow:null, criticalHigh:1000, lowText:"Serum glutamic-pyruvic transaminase is within physiological range.",                  highText:"SGPT/ALT is elevated. Viral hepatitis or liver parenchymal damage is suspected.", professionalName:"SGPT / ALT" },
      ALP:               { unit:"U/L",   min:44,   max:147,  criticalLow:null, criticalHigh:500,  lowText:"Alkaline phosphatase is below reference range. Hypothyroidism or pernicious anaemia should be considered.", highText:"Alkaline phosphatase is elevated. Cholestatic liver disease or bone pathology should be evaluated.", professionalName:"Alkaline Phosphatase (ALP)" },
      Albumin:           { unit:"g/dL",  min:3.5,  max:5,    criticalLow:2,    criticalHigh:null, lowText:"Serum albumin is below reference range. Malnutrition, liver disease, or nephrotic syndrome should be considered.", highText:"Albumin is above reference range. Dehydration is possible.", professionalName:"Serum Albumin" },
      "Total Protein":   { unit:"g/dL",  min:6.3,  max:8.2,  criticalLow:4,    criticalHigh:10,   lowText:"Total protein is below reference range. Malnutrition or hepatic dysfunction is possible.", highText:"Total protein is above reference range. Dehydration or chronic inflammatory condition should be evaluated.", professionalName:"Total Protein" },
    },
  },

  KFT: {
    label: "Kidney Function Test",
    icon: "🫘",
    sampleType: "Blood (Serum)",
    tests: {
      Urea:         { unit:"mg/dL", min:7,   max:20,  criticalLow:null, criticalHigh:100, lowText:"Blood urea is below reference range. Low protein intake or hepatic disease should be considered.", highText:"Blood urea is elevated. Renal impairment or volume depletion should be evaluated.", professionalName:"Blood Urea" },
      Creatinine:   { unit:"mg/dL", min:0.6, max:1.2, criticalLow:null, criticalHigh:10,  lowText:"Serum creatinine is below reference range. Reduced muscle mass is possible.", highText:"Serum creatinine is elevated. Renal insufficiency or acute kidney injury should be excluded.", professionalName:"Serum Creatinine" },
      "Uric Acid":  { unit:"mg/dL", min:3.4, max:7.0, criticalLow:null, criticalHigh:13,  lowText:"Uric acid is below reference range. Medication effect is possible.", highText:"Uric acid is above reference range. Hyperuricaemia with risk of gout or renal calculi.", professionalName:"Serum Uric Acid" },
      Sodium:       { unit:"mEq/L", min:136, max:145, criticalLow:120,  criticalHigh:160, lowText:"Serum sodium is below reference range. Hyponatraemia should be evaluated clinically.", highText:"Serum sodium is above reference range. Hypernatraemia due to dehydration or excess solute intake.", professionalName:"Serum Sodium" },
      Potassium:    { unit:"mEq/L", min:3.5, max:5.0, criticalLow:2.5,  criticalHigh:6.5, lowText:"Serum potassium is below reference range. Hypokalaemia with cardiac rhythm risk should be evaluated.", highText:"Serum potassium is above reference range. Hyperkalaemia with risk of cardiac arrhythmia.", professionalName:"Serum Potassium" },
      Chloride:     { unit:"mEq/L", min:98,  max:107, criticalLow:80,   criticalHigh:120, lowText:"Serum chloride is below reference range. Hypochloraemia should be evaluated.", highText:"Serum chloride is above reference range. Hyperchloraemia is present.", professionalName:"Serum Chloride" },
    },
  },

  "Lipid Profile": {
    label: "Lipid Profile",
    icon: "💛",
    sampleType: "Blood (Serum – Fasting 12h)",
    tests: {
      "Total Cholesterol": { unit:"mg/dL", min:0,  max:200, criticalLow:null, criticalHigh:300, lowText:"Total cholesterol is within acceptable limits.",               highText:"Total cholesterol is above the desirable range. Cardiovascular risk stratification and lifestyle modification are recommended.", professionalName:"Total Cholesterol" },
      HDL:                { unit:"mg/dL", min:40, max:999, criticalLow:25,   criticalHigh:null,lowText:"HDL cholesterol is below the protective threshold. Increased cardiovascular risk.", highText:"HDL cholesterol is above reference range. Generally considered cardioprotective.", professionalName:"HDL Cholesterol" },
      LDL:                { unit:"mg/dL", min:0,  max:100, criticalLow:null, criticalHigh:190, lowText:"LDL cholesterol is within optimal range.",                      highText:"LDL cholesterol is above optimal range. Cardiovascular risk is elevated. Lipid-lowering therapy may be indicated.", professionalName:"LDL Cholesterol" },
      Triglycerides:      { unit:"mg/dL", min:0,  max:150, criticalLow:null, criticalHigh:500, lowText:"Triglycerides are within normal physiological range.",           highText:"Triglycerides are elevated. Hypertriglyceridaemia with risk of pancreatitis at very high levels.", professionalName:"Serum Triglycerides" },
      VLDL:               { unit:"mg/dL", min:2,  max:30,  criticalLow:null, criticalHigh:80,  lowText:"VLDL cholesterol is within normal range.",                      highText:"VLDL cholesterol is elevated. Associated with hypertriglyceridaemia.", professionalName:"VLDL Cholesterol" },
    },
  },

  "Thyroid Profile": {
    label: "Thyroid Profile",
    icon: "🦋",
    sampleType: "Blood (Serum)",
    tests: {
      T3:  { unit:"ng/dL", min:80,  max:200, criticalLow:null, criticalHigh:null, lowText:"Total triiodothyronine is below reference range. Hypothyroidism or non-thyroidal illness should be considered.", highText:"Total triiodothyronine is above reference range. Hyperthyroidism or exogenous hormone excess.", professionalName:"Total T3 (Triiodothyronine)" },
      T4:  { unit:"µg/dL", min:5,   max:12,  criticalLow:null, criticalHigh:null, lowText:"Total thyroxine is below reference range. Primary or secondary hypothyroidism should be evaluated.", highText:"Total thyroxine is above reference range. Hyperthyroidism should be considered.", professionalName:"Total T4 (Thyroxine)" },
      TSH: { unit:"mIU/L", min:0.4, max:4.0, criticalLow:0.01, criticalHigh:10,  lowText:"Thyroid-stimulating hormone is below reference range. Hyperthyroidism or excess thyroid hormone supplementation.", highText:"Thyroid-stimulating hormone is above reference range. Primary hypothyroidism. Thyroid replacement therapy review is recommended.", professionalName:"Thyroid-Stimulating Hormone (TSH)" },
    },
  },

  "Diabetes Profile": {
    label: "Diabetes Profile",
    icon: "🍬",
    sampleType: "Blood (Serum – Fasting required for FBS)",
    tests: {
      "Fasting Blood Sugar": { unit:"mg/dL", min:70,  max:99,  criticalLow:40,   criticalHigh:500, lowText:"Fasting blood glucose is below reference range. Hypoglycaemia. Immediate clinical evaluation is advised if symptomatic.", highText:"Fasting blood glucose is above normal range. Diabetes mellitus or impaired fasting glucose should be evaluated.", professionalName:"Fasting Blood Glucose (FBS)" },
      "PP Blood Sugar":      { unit:"mg/dL", min:70,  max:140, criticalLow:40,   criticalHigh:500, lowText:"Post-prandial glucose is below reference range.",                      highText:"Post-prandial glucose is above reference range. Post-prandial hyperglycaemia or glucose intolerance.", professionalName:"Post-Prandial Blood Glucose (PPBS)" },
      HbA1c:                { unit:"%",     min:0,   max:5.7, criticalLow:null, criticalHigh:14,  lowText:"Glycated haemoglobin is within normal range.",                        highText:"Glycated haemoglobin is above the normal range. Suboptimal glycaemic control. Antidiabetic therapy review is recommended.", professionalName:"Glycated Haemoglobin (HbA1c)" },
    },
  },

  "Urine Routine": {
    label: "Urine Routine Examination",
    icon: "🔬",
    sampleType: "Urine (Mid-stream)",
    tests: {
      pH:               { unit:"",       min:4.5,   max:8.0,   criticalLow:null, criticalHigh:null, lowText:"Urine pH is in the acidic range.",               highText:"Urine pH is in the alkaline range.", professionalName:"Urine pH" },
      "Specific Gravity":{ unit:"",      min:1.001, max:1.030, criticalLow:null, criticalHigh:null, lowText:"Specific gravity is low. Dilute urine is noted.", highText:"Specific gravity is high. Concentrated urine is noted.", professionalName:"Specific Gravity" },
      Protein:          { unit:"mg/dL",  min:0,     max:8,     criticalLow:null, criticalHigh:300,  lowText:"Urine protein is within normal limits.",           highText:"Proteinuria is present. Nephrotic syndrome or glomerulonephritis should be evaluated.", professionalName:"Urine Protein" },
      Glucose:          { unit:"mg/dL",  min:0,     max:15,    criticalLow:null, criticalHigh:1000, lowText:"Urine glucose is within normal limits.",           highText:"Glucosuria is present. Uncontrolled diabetes mellitus or renal threshold abnormality should be excluded.", professionalName:"Urine Glucose" },
      RBC:              { unit:"/HPF",   min:0,     max:2,     criticalLow:null, criticalHigh:50,   lowText:"Red blood cells in urine are within normal limits.",highText:"Haematuria is present. Urinary tract infection, nephrolithiasis, or glomerulonephritis should be considered.", professionalName:"RBC in Urine" },
      "Pus Cells":      { unit:"/HPF",   min:0,     max:5,     criticalLow:null, criticalHigh:50,   lowText:"Pus cells are within normal limits.",              highText:"Pyuria is present. Urinary tract infection is suspected.", professionalName:"Pus Cells (WBC in Urine)" },
    },
  },

  Electrolytes: {
    label: "Serum Electrolytes",
    icon: "⚡",
    sampleType: "Blood (Serum)",
    tests: {
      Sodium:      { unit:"mEq/L", min:136, max:145, criticalLow:120, criticalHigh:160, lowText:"Hyponatraemia is present.",                     highText:"Hypernatraemia is present.", professionalName:"Serum Sodium" },
      Potassium:   { unit:"mEq/L", min:3.5, max:5.0, criticalLow:2.5, criticalHigh:6.5, lowText:"Hypokalaemia with cardiac risk is present.",     highText:"Hyperkalaemia with arrhythmia risk is present.", professionalName:"Serum Potassium" },
      Chloride:    { unit:"mEq/L", min:98,  max:107, criticalLow:80,  criticalHigh:120, lowText:"Hypochloraemia is present.",                     highText:"Hyperchloraemia is present.", professionalName:"Serum Chloride" },
      Bicarbonate: { unit:"mEq/L", min:22,  max:29,  criticalLow:10,  criticalHigh:40,  lowText:"Bicarbonate is below reference range. Metabolic acidosis should be evaluated.", highText:"Bicarbonate is above reference range. Metabolic alkalosis should be evaluated.", professionalName:"Serum Bicarbonate" },
      Calcium:     { unit:"mg/dL", min:8.5, max:10.5,criticalLow:6.5, criticalHigh:13,  lowText:"Hypocalcaemia is present. Tetany risk should be assessed.", highText:"Hypercalcaemia is present. Malignancy or hyperparathyroidism should be excluded.", professionalName:"Serum Calcium" },
      Phosphorus:  { unit:"mg/dL", min:2.5, max:4.5, criticalLow:null,criticalHigh:9,   lowText:"Serum phosphorus is below reference range.",      highText:"Serum phosphorus is above reference range. Renal disease should be evaluated.", professionalName:"Serum Phosphorus" },
    },
  },

  "Infection Panel": {
    label: "Infection Panel",
    icon: "🦠",
    sampleType: "Blood (Serum)",
    tests: {
      CRP:              { unit:"mg/L",  min:0, max:5,   criticalLow:null, criticalHigh:200, lowText:"C-reactive protein is within normal physiological limits.", highText:"C-reactive protein is elevated. Active infection or systemic inflammation is present.", professionalName:"C-Reactive Protein (CRP)" },
      ESR:              { unit:"mm/hr", min:0, max:20,  criticalLow:null, criticalHigh:100, lowText:"Erythrocyte sedimentation rate is within normal range.",     highText:"ESR is elevated. Infection, inflammatory condition, or malignancy should be evaluated.", professionalName:"Erythrocyte Sedimentation Rate (ESR)" },
      Procalcitonin:    { unit:"ng/mL", min:0, max:0.5, criticalLow:null, criticalHigh:10,  lowText:"Procalcitonin is within normal limits.",                     highText:"Procalcitonin is markedly elevated. Bacterial sepsis is highly probable. Immediate clinical intervention is indicated.", professionalName:"Procalcitonin" },
      "Widal Test (O)": { unit:"titre", min:0, max:1,   criticalLow:null, criticalHigh:null,lowText:"Widal O antigen titre is non-reactive.",                      highText:"Widal O antigen titre is reactive. Typhoid fever (Salmonella typhi) should be considered.", professionalName:"Widal Test (O Antigen)" },
      "Widal Test (H)": { unit:"titre", min:0, max:1,   criticalLow:null, criticalHigh:null,lowText:"Widal H antigen titre is non-reactive.",                      highText:"Widal H antigen titre is reactive. Typhoid fever should be considered.", professionalName:"Widal Test (H Antigen)" },
      "Malaria Antigen":{ unit:"",      min:0, max:0,   criticalLow:null, criticalHigh:null,lowText:"Malaria rapid antigen test is non-reactive.",                highText:"Malaria rapid antigen test is reactive. Malaria is detected. Immediate treatment initiation is required.", professionalName:"Malaria Rapid Antigen" },
    },
  },

  "Vitamin Profile": {
    label: "Vitamin Profile",
    icon: "💊",
    sampleType: "Blood (Serum)",
    tests: {
      "Vitamin D":   { unit:"ng/mL", min:30,  max:100, criticalLow:10,   criticalHigh:150, lowText:"25-hydroxyvitamin D is below the sufficient range. Vitamin D deficiency. Supplementation and sun exposure are recommended.", highText:"25-hydroxyvitamin D is above normal range. Vitamin D toxicity should be evaluated.", professionalName:"25-OH Vitamin D" },
      "Vitamin B12": { unit:"pg/mL", min:200, max:900, criticalLow:100,  criticalHigh:null,lowText:"Serum cobalamin is below reference range. Vitamin B12 deficiency with risk of neuropathy and megaloblastic anaemia.", highText:"Serum cobalamin is above reference range. Often reflects supplementation. Rarely clinically significant.", professionalName:"Serum Cobalamin (Vitamin B12)" },
      "Vitamin B6":  { unit:"µg/L",  min:5,   max:50,  criticalLow:null, criticalHigh:200, lowText:"Pyridoxine level is below reference range. Neuropathy risk.", highText:"Pyridoxine level is above reference range. Peripheral neurotoxicity is possible at very high concentrations.", professionalName:"Pyridoxine (Vitamin B6)" },
      Folate:        { unit:"ng/mL", min:2.7, max:17,  criticalLow:2,    criticalHigh:null,lowText:"Serum folate is below reference range. Megaloblastic anaemia and neural tube defect risk.", highText:"Serum folate is above reference range. Generally from supplementation. Not clinically harmful.", professionalName:"Serum Folate" },
      "Vitamin A":   { unit:"µg/dL", min:20,  max:60,  criticalLow:null, criticalHigh:200, lowText:"Retinol level is below reference range. Vitamin A deficiency with night blindness risk.", highText:"Retinol level is above reference range. Vitamin A toxicity (hypervitaminosis A) should be evaluated.", professionalName:"Serum Retinol (Vitamin A)" },
    },
  },
};

// ─── Clinical Interpretation Engine ──────────────────────────────────────────
// Pattern-based clinical correlation. Not diagnostic. Always recommends physician review.

const CLINICAL_PATTERNS = {
  CBC: [
    {
      id: "iron_deficiency_anemia",
      conditions: (r) =>
        isLow(r.Hemoglobin) && isLow(r.MCV) && isLow(r.MCH) && isLow(r.MCHC),
      pattern: "Pattern is suggestive of Iron Deficiency Anaemia (microcytic hypochromic pattern). Clinical correlation and serum iron studies are recommended.",
    },
    {
      id: "megaloblastic_anemia",
      conditions: (r) => isLow(r.Hemoglobin) && isHigh(r.MCV) && isHigh(r.MCH),
      pattern: "Pattern is suggestive of Megaloblastic Anaemia (macrocytic pattern). Vitamin B12 and folate levels should be evaluated.",
    },
    {
      id: "hemolytic_anemia",
      conditions: (r) => isLow(r.Hemoglobin) && isHigh(r.MCV) && isHigh(r.MCHC),
      pattern: "Pattern may be suggestive of Haemolytic Anaemia or Spherocytosis. Peripheral blood smear and reticulocyte count are recommended.",
    },
    {
      id: "bacterial_infection",
      conditions: (r) => isHigh(r.WBC) && isHigh(r.Neutrophils),
      pattern: "Pattern is suggestive of Bacterial Infection or Neutrophilia. Acute phase reactants and clinical assessment are recommended.",
    },
    {
      id: "viral_infection",
      conditions: (r) => isHigh(r.WBC) && !isHigh(r.Neutrophils),
      pattern: "Pattern may be suggestive of Viral Infection or Lymphocytosis. Clinical history and differential count are recommended.",
    },
    {
      id: "thrombocytopenia",
      conditions: (r) => isCritical(r.Platelets),
      pattern: "Pattern is suggestive of Thrombocytopenia. Bleeding risk is elevated. Immediate physician notification and clinical evaluation are required.",
    },
    {
      id: "pancytopenia",
      conditions: (r) => isLow(r.Hemoglobin) && isLow(r.WBC) && isLow(r.Platelets),
      pattern: "Pattern may be suggestive of Pancytopenia. Bone marrow pathology or aplastic anaemia should be excluded. Urgent haematology review is recommended.",
    },
  ],
  LFT: [
    {
      id: "hepatocellular_damage",
      conditions: (r) => isHigh(r.SGOT) && isHigh(r.SGPT),
      pattern: "Pattern is suggestive of Hepatocellular Injury. Viral hepatitis, toxic hepatopathy, or ischaemic hepatitis should be excluded.",
    },
    {
      id: "cholestasis",
      conditions: (r) => isHigh(r.ALP) && isHigh(r["Bilirubin Total"]),
      pattern: "Pattern may be suggestive of Cholestatic Liver Disease or Obstructive Jaundice. Biliary imaging is recommended.",
    },
    {
      id: "hypoalbuminemia",
      conditions: (r) => isLow(r.Albumin) && isLow(r["Total Protein"]),
      pattern: "Pattern is suggestive of Hypoalbuminaemia with Protein Deficiency. Malnutrition or hepatic synthetic dysfunction should be evaluated.",
    },
  ],
  KFT: [
    {
      id: "renal_impairment",
      conditions: (r) => isHigh(r.Urea) && isHigh(r.Creatinine),
      pattern: "Pattern is suggestive of Renal Impairment (azotaemia). Acute kidney injury or chronic kidney disease should be evaluated.",
    },
    {
      id: "hyperkalemia_risk",
      conditions: (r) => isCritical(r.Potassium),
      pattern: "Pattern is suggestive of Critical Hyperkalaemia. Cardiac arrhythmia risk is elevated. Immediate physician notification is required.",
    },
    {
      id: "hyperuricemia_gout",
      conditions: (r) => isHigh(r["Uric Acid"]) && isHigh(r.Creatinine),
      pattern: "Pattern may be suggestive of Hyperuricaemia associated with Renal Insufficiency. Gout prophylaxis and renal function monitoring are recommended.",
    },
  ],
  "Lipid Profile": [
    {
      id: "high_cv_risk",
      conditions: (r) => isHigh(r.LDL) && isHigh(r["Total Cholesterol"]) && isLow(r.HDL),
      pattern: "Pattern is suggestive of High Cardiovascular Risk Dyslipidaemia. Lipid-lowering therapy and lifestyle modification are strongly recommended.",
    },
    {
      id: "hypertriglyceridemia",
      conditions: (r) => isHigh(r.Triglycerides) && isHigh(r.VLDL),
      pattern: "Pattern is suggestive of Primary Hypertriglyceridaemia. Pancreatitis risk should be assessed at very high levels.",
    },
  ],
  "Thyroid Profile": [
    {
      id: "hypothyroidism",
      conditions: (r) => isHigh(r.TSH) && isLow(r.T4),
      pattern: "Pattern is suggestive of Primary Hypothyroidism. Thyroid hormone replacement therapy review is recommended.",
    },
    {
      id: "hyperthyroidism",
      conditions: (r) => isLow(r.TSH) && isHigh(r.T4),
      pattern: "Pattern is suggestive of Primary Hyperthyroidism. Anti-thyroid therapy or radioiodine evaluation may be indicated.",
    },
    {
      id: "subclinical_hypothyroidism",
      conditions: (r) => isHigh(r.TSH) && !isLow(r.T4),
      pattern: "Pattern may be suggestive of Subclinical Hypothyroidism. Clinical monitoring and thyroid antibody evaluation are recommended.",
    },
  ],
  "Diabetes Profile": [
    {
      id: "uncontrolled_diabetes",
      conditions: (r) => isHigh(r["Fasting Blood Sugar"]) && isHigh(r.HbA1c),
      pattern: "Pattern is suggestive of Poorly Controlled Diabetes Mellitus. Antidiabetic medication review and dietary counselling are recommended.",
    },
    {
      id: "impaired_fasting_glucose",
      conditions: (r) => isHigh(r["Fasting Blood Sugar"]) && !isHigh(r.HbA1c),
      pattern: "Pattern may be suggestive of Impaired Fasting Glucose or Pre-diabetes. Lifestyle intervention and repeat testing are recommended.",
    },
  ],
  "Infection Panel": [
    {
      id: "bacterial_sepsis",
      conditions: (r) => isHigh(r.CRP) && isHigh(r.Procalcitonin),
      pattern: "Pattern is strongly suggestive of Bacterial Sepsis. Procalcitonin elevation combined with elevated CRP is a critical finding. Immediate physician notification and blood culture are required.",
    },
    {
      id: "typhoid_fever",
      conditions: (r) => isHigh(r["Widal Test (O)"]) && isHigh(r["Widal Test (H)"]),
      pattern: "Pattern is suggestive of Typhoid Fever (Salmonella typhi). Clinical correlation with fever history and blood culture confirmation are recommended.",
    },
  ],
  "Vitamin Profile": [
    {
      id: "dual_deficiency",
      conditions: (r) => isLow(r["Vitamin D"]) && isLow(r["Vitamin B12"]),
      pattern: "Pattern is suggestive of Combined Vitamin D and Vitamin B12 Deficiency. Supplementation and dietary assessment are recommended.",
    },
  ],
};

// Helper flags for pattern matching
function statusOf(result) {
  return result?.status || "";
}
function isLow(r)      { const s = statusOf(r); return s.includes("Decreased") || s === "Low"; }
function isHigh(r)     { const s = statusOf(r); return s.includes("Elevated") || s === "High" || s === "Borderline Elevated"; }
function isCritical(r) { const s = statusOf(r); return s.startsWith("Critical"); }
function isAbnormal(r) { return isLow(r) || isHigh(r) || isCritical(r); }

function runClinicalPatterns(profileKey, profileResults) {
  const patterns = CLINICAL_PATTERNS[profileKey];
  if (!patterns || !profileResults) return [];
  return patterns
    .filter(({ conditions }) => conditions(profileResults))
    .map(({ id, pattern }) => ({ id, pattern }));
}

// ─── Empty Form (future-ready fields included) ────────────────────────────────

const emptyForm = {
  testId: "",
  patientName: "",
  patientId: "",
  patientGender: "",
  patientAge: "",
  testName: "",
  category: "",
  priority: "Routine",
  requestedBy: "",
  requestDate: "",
  resultDate: "",
  status: "Pending",
  result: "",
  profileResults: {},
  resultStatus: "",
  referenceRange: "",
  interpretation: "",
  notes: "",
  // Trend / previous report architecture (frontend-only)
  previousReportId: "",
  previousProfileResults: {},
  // Future AI architecture stubs
  aiClinicalNotes: null,
  aiDifferentialSuggestions: [],
  aiRiskPrediction: null,
  aiComparisonSummary: null,
  // Lab workflow fields (frontend-ready)
  labTechnicianName: "",
  verifyingDoctor: "",
  sampleType: "",
  sampleBarcode: "",
  sampleCollectedAt: "",
  sampleReceivedAt: "",
  sampleProcessedAt: "",
  attachments: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId()   { return "LAB-" + Date.now().toString().slice(-6); }
function today()   { return new Date().toISOString().split("T")[0]; }
function nowTime() { return new Date().toLocaleString("en-IN", { hour12: true, day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); }

function readArrayFromStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function dispatchPatientsUpdate() {
  window.dispatchEvent(new Event("patientsUpdated"));
}

/**
 * Resolve gender-specific reference range if available and patient gender is known.
 */
function resolveRef(ref, gender) {
  if (gender && ref.genderRanges?.[gender.toLowerCase()]) {
    const gr = ref.genderRanges[gender.toLowerCase()];
    return { ...ref, min: gr.min, max: gr.max };
  }
  return ref;
}

/**
 * judgeTestResult — core analysis engine with professional language & gender ranges.
 */
function judgeTestResult(profileKey, testName, value, gender = "") {
  const profile = LAB_MASTER_LIBRARY[profileKey];
  const rawRef  = profile?.tests?.[testName];
  if (!rawRef || value === "" || Number.isNaN(Number(value))) {
    return { status: "Manual Review", unit: "", referenceRange: "Not available", interpretation: "Reference range not available. Doctor/laboratory review is required.", isCritical: false };
  }

  const ref    = resolveRef(rawRef, gender);
  const num    = Number(value);
  const status = getProfessionalStatus(num, ref);
  const maxDisp = ref.max === 999 ? "+" : ` – ${ref.max}`;
  const rangeStr = `${ref.min}${maxDisp} ${ref.unit}`.trim() + (gender && rawRef.genderRanges ? ` (${gender})` : "");
  const isCrit = status === "Critical Low" || status === "Critical High";
  const isAbove = num > ref.max && ref.max !== 999;
  const text   = isAbove ? rawRef.highText : rawRef.lowText;
  const interpretation =
    status === "Within Normal Limits"
      ? `${rawRef.professionalName || testName} is within normal physiological limits.`
      : text;

  return { status, unit: rawRef.unit, referenceRange: rangeStr, interpretation, isCritical: isCrit };
}

/**
 * Backward-compat wrapper for single-result tests not in master library.
 */
function judgeLabResult(testName, value) {
  if (value === "" || Number.isNaN(Number(value))) {
    return { status: "Manual Review", unit: "", referenceRange: "Not available", interpretation: "Reference range not available. Doctor/laboratory review is required.", isCritical: false };
  }
  return { status: "Within Normal Limits", unit: "", referenceRange: "Not available", interpretation: "Result has been entered. Physician review is recommended.", isCritical: false };
}

/**
 * computeTrend — compares current vs previous value.
 */
function computeTrend(currentVal, previousVal) {
  const cur = Number(currentVal);
  const pre = Number(previousVal);
  if (isNaN(cur) || isNaN(pre) || pre === 0) return null;
  const diff = cur - pre;
  const pct  = ((diff / pre) * 100).toFixed(1);
  return {
    difference: diff.toFixed(2),
    percentChange: pct,
    direction: diff > 0.05 * pre ? "up" : diff < -0.05 * pre ? "down" : "stable",
  };
}

/**
 * generateProfileSummary — professional lab language summary.
 */
function generateProfileSummary(profileKey, profileResults, previousResults = {}) {
  if (!profileResults || Object.keys(profileResults).length === 0) {
    return { lines: [], overallImpression: "", hasCritical: false, clinicalPatterns: [] };
  }

  const lines     = [];
  const abnormals = [];
  const criticals = [];

  Object.entries(profileResults).forEach(([testName, result]) => {
    if (result?.value === "" || result?.value == null) return;
    const { status, referenceRange } = result;
    const prof = LAB_MASTER_LIBRARY[profileKey]?.tests?.[testName];
    const displayName = prof?.professionalName || testName;

    if (status === "Within Normal Limits") {
      lines.push({ testName, text: `${displayName} is within normal physiological limits.`, status });
    } else if (["Mildly Decreased","Moderately Decreased","Severely Decreased","Borderline Elevated","Moderately Elevated","Markedly Elevated","Low","High"].includes(status)) {
      abnormals.push(displayName);
      lines.push({ testName, text: `${displayName} is ${status.toLowerCase()} (Reference: ${referenceRange}).`, status });
    } else if (status === "Critical Low" || status === "Critical High") {
      criticals.push(displayName);
      lines.push({ testName, text: `CRITICAL: ${displayName} is ${status} (Reference: ${referenceRange}). Immediate physician notification is mandatory.`, status });
    }

    // Trend
    if (previousResults[testName]?.value != null) {
      const trend = computeTrend(result.value, previousResults[testName].value);
      if (trend) result._trend = trend;
    }
  });

  const clinicalPatterns = runClinicalPatterns(profileKey, profileResults);

  let overallImpression = "All entered values are within normal physiological limits. No immediate clinical concern identified.";
  if (criticals.length > 0) {
    overallImpression = `Critical values detected in: ${criticals.join(", ")}. Immediate physician notification is required. Verify sample integrity and consider repeat testing if clinically indicated.`;
  } else if (abnormals.length > 0) {
    overallImpression = `Abnormal values observed in: ${abnormals.join(", ")}. Clinical correlation and physician review are recommended.`;
  }

  return { lines, overallImpression, hasCritical: criticals.length > 0, clinicalPatterns };
}

// ─── Color map (professional) ─────────────────────────────────────────────────

const statusBadgeClass = {
  "Within Normal Limits": "bg-green-100 text-green-700",
  "Mildly Decreased":     "bg-yellow-100 text-yellow-700",
  "Moderately Decreased": "bg-yellow-200 text-yellow-800",
  "Severely Decreased":   "bg-orange-200 text-orange-800",
  "Borderline Elevated":  "bg-blue-100 text-blue-700",
  "Moderately Elevated":  "bg-orange-100 text-orange-700",
  "Markedly Elevated":    "bg-orange-200 text-orange-800",
  "Critical Low":         "bg-red-200 text-red-800",
  "Critical High":        "bg-red-200 text-red-800",
  "Manual Review":        "bg-gray-100 text-gray-600",
  // backward compat
  Normal:  "bg-green-100 text-green-700",
  Low:     "bg-yellow-100 text-yellow-700",
  High:    "bg-orange-100 text-orange-700",
};

const statusTableBadgeClass = {
  "Within Normal Limits": "bg-green-100 text-green-700 border-green-200",
  "Mildly Decreased":     "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Moderately Decreased": "bg-yellow-200 text-yellow-800 border-yellow-300",
  "Severely Decreased":   "bg-orange-200 text-orange-800 border-orange-300",
  "Borderline Elevated":  "bg-blue-100 text-blue-700 border-blue-200",
  "Moderately Elevated":  "bg-orange-100 text-orange-700 border-orange-200",
  "Markedly Elevated":    "bg-orange-200 text-orange-800 border-orange-300",
  "Critical Low":         "bg-red-200 text-red-800 border-red-300",
  "Critical High":        "bg-red-200 text-red-800 border-red-300",
  "Manual Review":        "bg-gray-100 text-gray-500 border-gray-200",
  Normal:                 "bg-green-100 text-green-700 border-green-200",
  Low:                    "bg-yellow-100 text-yellow-700 border-yellow-200",
  High:                   "bg-orange-100 text-orange-700 border-orange-200",
};

// ─── Trend Badge ──────────────────────────────────────────────────────────────

function TrendBadge({ trend }) {
  if (!trend) return <span className="text-xs text-gray-400">—</span>;
  const { direction, difference, percentChange } = trend;
  const icon = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const cls  = direction === "up" ? "text-red-600" : direction === "down" ? "text-blue-600" : "text-gray-500";
  return (
    <span className={`text-xs font-bold ${cls}`} title={`${difference > 0 ? "+" : ""}${difference} (${percentChange}%)`}>
      {icon} {percentChange}%
    </span>
  );
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

function downloadLabReportPDF(test) {
  const doc        = new jsPDF();
  const profileDef = LAB_MASTER_LIBRARY[test.testName];
  const pageW      = 210;
  const generated  = nowTime();
  let pageNum      = 1;

  function addPageNumber() {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum}`, pageW / 2, 292, { align: "center" });
    doc.text("CONFIDENTIAL — MEDICAL DOCUMENT", pageW / 2, 286, { align: "center" });
  }

  // ── Header ──
  doc.setFillColor(40, 60, 140);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(30, 50, 120);
  doc.rect(0, 29, pageW, 3, "F");

  // Logo placeholder
  doc.setFillColor(255, 255, 255, 0.15);
  doc.roundedRect(12, 4, 24, 24, 3, 3, "S");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("🏥", 18, 18);

  doc.setFontSize(16);
  doc.text("MediCare Pro", 42, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Smart Healthcare Dashboard — Laboratory Information System", 42, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("LABORATORY REPORT", pageW - 14, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${generated}`, pageW - 14, 21, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // ── Patient Details Section ──
  let y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 60, 140);
  doc.text("▌ PATIENT DETAILS", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 4;
  doc.setDrawColor(40, 60, 140);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const patFields = [
    [`Report ID: ${test.testId}`,              `Patient Name: ${test.patientName}`],
    [`Patient ID: ${test.patientId || "—"}`,   `Gender: ${test.patientGender || "—"}`],
    [`Profile: ${test.testName}`,              `Category: ${test.category}`],
    [`Priority: ${test.priority}`,             `Status: ${test.status}`],
    [`Ordered By: Dr. ${test.requestedBy}`,    `Request Date: ${test.requestDate}`],
    [`Result Date: ${test.resultDate || "—"}`, `Sample Type: ${profileDef?.sampleType || test.sampleType || "—"}`],
  ];
  patFields.forEach(([left, right]) => {
    doc.text(left, 14, y);
    doc.text(right, 110, y);
    y += 7;
  });

  // ── Sample Information Section ──
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 60, 140);
  doc.text("▌ SAMPLE INFORMATION", 14, y);
  doc.setTextColor(0, 0, 0);
  y += 4;
  doc.line(14, y, pageW - 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Sample Type: ${profileDef?.sampleType || "—"}`, 14, y);
  doc.text(`Barcode: ${test.sampleBarcode || "—"}`, 90, y);
  y += 7;
  doc.text(`Collected: ${test.sampleCollectedAt || "—"}`, 14, y);
  doc.text(`Received: ${test.sampleReceivedAt || "—"}`,  90, y);
  y += 7;
  doc.text(`Processed: ${test.sampleProcessedAt || "—"}`, 14, y);
  doc.text(`Lab Technician: ${test.labTechnicianName || "—"}`, 90, y);
  y += 10;

  // ── Profile Results Table ──
  if (test.profileResults && Object.keys(test.profileResults).length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 60, 140);
    doc.text("▌ PROFILE RESULTS", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
    doc.line(14, y, pageW - 14, y);
    y += 6;

    // Table header
    doc.setFillColor(230, 235, 255);
    doc.rect(14, y - 4, pageW - 28, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 60, 140);
    doc.text("TEST NAME",       16, y);
    doc.text("VALUE",           80, y);
    doc.text("UNIT",           100, y);
    doc.text("STATUS",         120, y);
    doc.text("REFERENCE",      155, y);
    doc.text("TREND",          185, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
    doc.setLineWidth(0.3);
    doc.line(14, y, pageW - 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    const entries = Object.entries(test.profileResults);
    entries.forEach(([testName, result]) => {
      if (result?.value == null || result?.value === "") return;
      const status  = result.status || "—";
      const isCrit  = status === "Critical Low" || status === "Critical High";
      const isAbn   = isAbnormal(result);
      if (isCrit)      doc.setTextColor(160, 0, 0);
      else if (isAbn)  doc.setTextColor(180, 90, 0);
      const prof = LAB_MASTER_LIBRARY[test.testName]?.tests?.[testName];
      doc.text(prof?.professionalName || testName, 16, y, { maxWidth: 60 });
      doc.text(String(result.value),          80, y);
      doc.text(result.unit || "—",           100, y);
      doc.text(status,                       120, y, { maxWidth: 32 });
      doc.text(result.referenceRange || "—", 155, y, { maxWidth: 28 });
      if (result._trend) {
        const arrow = result._trend.direction === "up" ? "↑" : result._trend.direction === "down" ? "↓" : "→";
        doc.text(`${arrow}${result._trend.percentChange}%`, 185, y);
      } else { doc.text("—", 185, y); }
      doc.setTextColor(0, 0, 0);
      y += 7;
      if (y > 265) { addPageNumber(); doc.addPage(); pageNum++; y = 20; }
    });

    // ── Clinical Interpretation ──
    const summary = generateProfileSummary(test.testName, test.profileResults, test.previousProfileResults || {});
    if (summary.clinicalPatterns.length > 0) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40, 60, 140);
      doc.text("▌ CLINICAL INTERPRETATION", 14, y);
      doc.setTextColor(0, 0, 0);
      y += 4;
      doc.line(14, y, pageW - 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      summary.clinicalPatterns.forEach(({ pattern }) => {
        const lines = doc.splitTextToSize(`• ${pattern}`, 175);
        doc.text(lines, 16, y);
        y += lines.length * 5 + 3;
        if (y > 265) { addPageNumber(); doc.addPage(); pageNum++; y = 20; }
      });
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Clinical correlation is recommended for all pattern-based interpretations.", 16, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 8;
    }

    // ── Overall Laboratory Impression ──
    if (summary.lines.length > 0) {
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40, 60, 140);
      doc.text("▌ OVERALL LABORATORY IMPRESSION", 14, y);
      doc.setTextColor(0, 0, 0);
      y += 4;
      doc.line(14, y, pageW - 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const impLines = doc.splitTextToSize(summary.overallImpression, 175);
      doc.text(impLines, 16, y);
      y += impLines.length * 5 + 6;
    }
  } else {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("▌ RESULT", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const rLines = doc.splitTextToSize(test.result || "No result entered.", 175);
    doc.text(rLines, 14, y);
    y += rLines.length * 5 + 8;
  }

  // ── Doctor Notes ──
  if (test.notes) {
    if (y > 240) { addPageNumber(); doc.addPage(); pageNum++; y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 60, 140);
    doc.text("▌ DOCTOR NOTES", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(test.notes, 175);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 5 + 8;
  }

  // ── Signature Block + Seal + QR ──
  if (y > 235) { addPageNumber(); doc.addPage(); pageNum++; y = 20; }
  y = Math.max(y + 12, 230);

  // Signature lines
  doc.setLineWidth(0.4);
  doc.setDrawColor(100, 100, 100);
  doc.line(14, y, 75, y);
  doc.line(90, y, 150, y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Lab Technician", 14, y + 5);
  doc.text(test.labTechnicianName || "_________________________", 14, y + 11);
  doc.text("Verifying Doctor / Pathologist", 90, y + 5);
  doc.text(test.verifyingDoctor || "_________________________", 90, y + 11);

  // Laboratory Seal placeholder
  doc.setDrawColor(40, 60, 140);
  doc.setLineWidth(1);
  doc.circle(180, y - 8, 12, "S");
  doc.setFontSize(6);
  doc.setTextColor(40, 60, 140);
  doc.text("LAB", 176.5, y - 10);
  doc.text("SEAL", 175.5, y - 5);
  doc.text("[Placeholder]", 172, y);
  doc.setTextColor(0, 0, 0);

  // QR placeholder
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.rect(155, y - 22, 18, 18, "S");
  doc.setFontSize(5.5);
  doc.setTextColor(130, 130, 130);
  doc.text("QR Verify", 156, y - 7);
  doc.setTextColor(0, 0, 0);

  // ── Disclaimer ──
  y += 20;
  doc.setLineWidth(0.3);
  doc.setDrawColor(180, 180, 180);
  doc.line(14, y, pageW - 14, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "italic");
  const disclaimer =
    "LABORATORY DISCLAIMER: This report is system-assisted and has been generated for informational purposes only. " +
    "All results must be interpreted in clinical context and reviewed by a qualified medical professional before any clinical decision is made. " +
    "Reference ranges are general guidelines and may vary by laboratory. Clinical correlation is recommended.";
  const discLines = doc.splitTextToSize(disclaimer, pageW - 28);
  doc.text(discLines, 14, y);

  addPageNumber();
  doc.save(`${test.testId}_${test.testName.replace(/\s+/g, "_")}_lab_report.pdf`);
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = { success: "bg-emerald-600", error: "bg-red-600", warning: "bg-amber-500" };
  return (
    <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white shadow-xl flex items-center gap-3 ${colors[type] || "bg-gray-700"}`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="font-bold text-xl leading-none opacity-80 hover:opacity-100">×</button>
    </div>
  );
}

// ─── Critical Alert Banner (Enhanced) ────────────────────────────────────────

function CriticalAlertBanner({ profileResults }) {
  const criticals = Object.entries(profileResults || {}).filter(
    ([, r]) => r?.status === "Critical Low" || r?.status === "Critical High"
  );
  if (criticals.length === 0) return null;
  return (
    <div className="bg-red-700 text-white rounded-xl p-4 mb-4 flex items-start gap-3 shadow-lg border-2 border-red-400">
      <span className="text-2xl mt-0.5">🚨</span>
      <div className="flex-1">
        <p className="font-bold text-base">CRITICAL LABORATORY ALERT — Immediate Physician Notification Required</p>
        <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
          {criticals.map(([testName, r]) => (
            <li key={testName}><strong>{testName}:</strong> {r.value} {r.unit} — {r.status} (Reference: {r.referenceRange})</li>
          ))}
        </ul>
        <div className="mt-3 text-xs bg-red-800/50 rounded-lg p-2 space-y-0.5">
          <p>⚠️ Verify sample integrity and patient identity before reporting.</p>
          <p>🔁 Consider repeat testing if result is clinically discordant.</p>
          <p>📞 Notify attending physician immediately. Document notification time.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Results Table ────────────────────────────────────────────────────

function ProfileResultsTable({ profileResults, profileKey, previousResults = {} }) {
  if (!profileResults || Object.keys(profileResults).length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-indigo-50 text-indigo-800 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left">Test</th>
            <th className="px-3 py-2 text-right">Value</th>
            <th className="px-3 py-2 text-center">Unit</th>
            <th className="px-3 py-2 text-center">Status</th>
            <th className="px-3 py-2 text-left">Reference Range</th>
            <th className="px-3 py-2 text-center">Prev. Value</th>
            <th className="px-3 py-2 text-center">Trend</th>
            <th className="px-3 py-2 text-left">Interpretation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Object.entries(profileResults).map(([testName, result]) => {
            const prev  = previousResults[testName];
            const trend = prev?.value != null ? computeTrend(result?.value, prev.value) : null;
            const cls   = result?.status?.startsWith("Critical")
              ? "bg-red-50"
              : isAbnormal(result) ? "bg-yellow-50/40" : "hover:bg-gray-50";
            return (
              <tr key={testName} className={cls}>
                <td className="px-3 py-2 font-medium text-gray-800 text-xs">
                  {LAB_MASTER_LIBRARY[profileKey]?.tests?.[testName]?.professionalName || testName}
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">{result?.value ?? "—"}</td>
                <td className="px-3 py-2 text-center text-gray-500 text-xs">{result?.unit || "—"}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusTableBadgeClass[result?.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {result?.status || "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{result?.referenceRange || "—"}</td>
                <td className="px-3 py-2 text-center text-xs text-gray-400">{prev?.value ?? "—"}</td>
                <td className="px-3 py-2 text-center"><TrendBadge trend={trend} /></td>
                <td className="px-3 py-2 text-xs text-gray-600 max-w-[180px]">{result?.interpretation || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Laboratory Summary Panel ─────────────────────────────────────────────────

function LabSummaryPanel({ profileKey, profileResults, previousResults = {} }) {
  const summary = useMemo(
    () => generateProfileSummary(profileKey, profileResults, previousResults),
    [profileKey, profileResults, previousResults]
  );
  if (summary.lines.length === 0) return null;

  return (
    <div className={`rounded-xl border p-4 mt-4 ${summary.hasCritical ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
      <p className={`font-bold text-sm mb-3 ${summary.hasCritical ? "text-red-800" : "text-blue-800"}`}>
        📋 Laboratory Summary — {profileKey}
      </p>
      <ul className="space-y-1.5 mb-3">
        {summary.lines.map(({ testName, text, status }) => (
          <li key={testName} className={`text-xs flex items-start gap-1.5 ${
            status === "Within Normal Limits" || status === "Normal" ? "text-green-700"
            : (status === "Critical Low" || status === "Critical High") ? "text-red-700 font-semibold"
            : "text-amber-700"}`}>
            <span>{(status === "Within Normal Limits" || status === "Normal") ? "✅" : (status === "Critical Low" || status === "Critical High") ? "🚨" : "⚠️"}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      {/* Clinical Patterns */}
      {summary.clinicalPatterns.length > 0 && (
        <div className="border-t border-blue-200 pt-3 mt-2 mb-3">
          <p className="text-xs font-bold text-indigo-800 mb-2">🧬 Clinical Pattern Recognition</p>
          <ul className="space-y-2">
            {summary.clinicalPatterns.map(({ id, pattern }) => (
              <li key={id} className="text-xs bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-indigo-800">
                {pattern}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 italic mt-1">Clinical correlation is recommended for all pattern-based interpretations.</p>
        </div>
      )}

      <div className={`border-t pt-2 text-xs font-semibold ${summary.hasCritical ? "border-red-200 text-red-800" : "border-blue-200 text-blue-800"}`}>
        Overall Impression: {summary.overallImpression}
      </div>
      <p className="text-xs text-gray-400 mt-1 italic">
        This report is system-assisted and must be reviewed by a qualified medical professional before any clinical decision.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LaboratoryPage() {
  const [tests,          setTests]          = useState([]);
  const [patients,       setPatients]       = useState([]);
  const [form,           setForm]           = useState(emptyForm);
  const [editingId,      setEditingId]      = useState(null);
  const [showForm,       setShowForm]       = useState(false);
  const [search,         setSearch]         = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus,   setFilterStatus]   = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [toast,          setToast]          = useState(null);
  const [isLoaded,       setIsLoaded]       = useState(false);
  const [viewingTest,    setViewingTest]    = useState(null);

  // Load on mount
  useEffect(() => {
    setTests(readArrayFromStorage(STORAGE_KEY));
    setPatients(readArrayFromStorage(PATIENTS_KEY));
    setIsLoaded(true);
  }, []);

  // Sync patients from other pages
  useEffect(() => {
    const loadPatients = () => setPatients(readArrayFromStorage(PATIENTS_KEY));
    window.addEventListener("patientsUpdated", loadPatients);
    window.addEventListener("storage", loadPatients);
    return () => {
      window.removeEventListener("patientsUpdated", loadPatients);
      window.removeEventListener("storage", loadPatients);
    };
  }, []);

  // Persist lab tests
  useEffect(() => {
    if (isLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  }, [tests, isLoaded]);

  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "result") {
        const j = judgeLabResult(updated.testName, value);
        updated.resultStatus   = j.status;
        updated.referenceRange = j.referenceRange;
        updated.interpretation = j.interpretation;
      }
      if (name === "testName") {
        updated.profileResults = {};
        updated.result         = "";
        updated.resultStatus   = "";
        updated.referenceRange = "";
        updated.interpretation = "";
      }
      return updated;
    });
  }

  function handleProfileResultChange(profileKey, testName, value) {
    const gender    = form.patientGender;
    const judgement = judgeTestResult(profileKey, testName, value, gender);
    setForm((prev) => ({
      ...prev,
      profileResults: {
        ...prev.profileResults,
        [testName]: {
          value,
          unit:           judgement.unit,
          status:         judgement.status,
          referenceRange: judgement.referenceRange,
          interpretation: judgement.interpretation,
          isCritical:     judgement.isCritical,
        },
      },
    }));
  }

  function openAddForm() {
    setForm({ ...emptyForm, testId: genId(), requestDate: today() });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(test) {
    setForm({ ...emptyForm, ...test });
    setEditingId(test.testId);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function validate() {
    if (!form.patientId)          return "Please select a patient.";
    if (!form.patientName.trim()) return "Patient Name is required.";
    if (!form.testName.trim())    return "Test Name is required.";
    if (!form.category)           return "Category is required.";
    if (!form.requestedBy.trim()) return "Requested By is required.";
    if (!form.requestDate)        return "Request Date is required.";
    return null;
  }

  function syncLabEventToPatientTimeline(test) {
    const savedPatients = readArrayFromStorage(PATIENTS_KEY);
    const updatedPatients = savedPatients.map((patient) => {
      const isSame = patient.id === test.patientId || patient.name?.toLowerCase() === test.patientName?.toLowerCase();
      if (!isSame) return patient;
      const timeline = patient.timeline || [];
      const ev = {
        id: `TL-${test.testId}`, labTestId: test.testId,
        date: test.resultDate || test.requestDate || today(),
        type: "Lab Test", title: `${test.testName} - ${test.status}`,
        details: `Lab test ${test.testId} — ${test.category}. Priority: ${test.priority}. Status: ${test.status}.`,
      };
      const exists = timeline.some((e) => e.labTestId === test.testId || e.id === `TL-${test.testId}`);
      return {
        ...patient,
        status: test.status === "Completed" ? patient.status : "Lab Test",
        timeline: exists
          ? timeline.map((e) => e.labTestId === test.testId || e.id === `TL-${test.testId}` ? { ...e, ...ev } : e)
          : [...timeline, ev],
      };
    });
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(updatedPatients));
    setPatients(updatedPatients);
    dispatchPatientsUpdate();
  }

  function handleSubmit() {
    const error = validate();
    if (error) { showToast(error, "error"); return; }
    const savedTest = {
      ...form,
      resultDate: form.status === "Completed" && !form.resultDate ? today() : form.resultDate,
    };
    if (editingId) {
      setTests((prev) => prev.map((t) => (t.testId === editingId ? savedTest : t)));
      syncLabEventToPatientTimeline(savedTest);
      showToast("Lab test updated and patient timeline synced.", "success");
    } else {
      setTests((prev) => [savedTest, ...prev]);
      syncLabEventToPatientTimeline(savedTest);
      showToast("Lab test added and patient timeline synced.", "success");
    }
    closeForm();
  }

  function handleDelete(testId) {
    if (!window.confirm("Delete this lab test record?")) return;
    setTests((prev) => prev.filter((t) => t.testId !== testId));
    showToast("Record deleted.", "warning");
  }

  function updateStatus(testId, newStatus) {
    setTests((prev) =>
      prev.map((test) => {
        if (test.testId !== testId) return test;
        const updated = { ...test, status: newStatus, resultDate: newStatus === "Completed" ? today() : test.resultDate };
        syncLabEventToPatientTimeline(updated);
        return updated;
      })
    );
    showToast(`Status updated to ${newStatus}.`, "success");
  }

  // ── Derived / memoised state ──
  const filtered = useMemo(() => tests.filter((test) => {
    const term = search.toLowerCase();
    return (
      (test.patientName?.toLowerCase().includes(term) || test.testName?.toLowerCase().includes(term) ||
       test.testId?.toLowerCase().includes(term) || test.requestedBy?.toLowerCase().includes(term)) &&
      (filterCategory === "All" || test.category === filterCategory) &&
      (filterStatus   === "All" || test.status   === filterStatus)   &&
      (filterPriority === "All" || test.priority === filterPriority)
    );
  }), [tests, search, filterCategory, filterStatus, filterPriority]);

  const stats = useMemo(() => ({
    pending:     tests.filter((t) => t.status === "Pending").length,
    inProgress:  tests.filter((t) => t.status === "In Progress").length,
    completed:   tests.filter((t) => t.status === "Completed").length,
    emergency:   tests.filter((t) => t.priority === "Emergency").length,
    critical:    tests.filter((t) => t.profileResults && Object.values(t.profileResults).some((r) => r?.isCritical)).length,
  }), [tests]);

  const activeProfileDef = LAB_MASTER_LIBRARY[form.testName];
  const formHasCritical  = useMemo(
    () => Object.values(form.profileResults || {}).some((r) => r?.isCritical),
    [form.profileResults]
  );

  const statusColor   = { Pending:"bg-yellow-100 text-yellow-700","In Progress":"bg-blue-100 text-blue-700",Completed:"bg-green-100 text-green-700",Cancelled:"bg-gray-100 text-gray-500" };
  const priorityColor = { Routine:"bg-gray-100 text-gray-600",Urgent:"bg-orange-100 text-orange-700",Emergency:"bg-red-100 text-red-700" };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔬 Laboratory Information System</h1>
          <p className="text-sm text-gray-500 mt-1">Professional diagnostics — test requests, results & clinical analysis.</p>
        </div>
        <button onClick={openAddForm} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition shadow">
          + New Test Request
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <SummaryCard label="Pending"     value={stats.pending}    color="yellow" icon="⏳" />
        <SummaryCard label="In Progress" value={stats.inProgress} color="blue"   icon="🔄" />
        <SummaryCard label="Completed"   value={stats.completed}  color="green"  icon="✅" />
        <SummaryCard label="Emergency"   value={stats.emergency}  color="red"    icon="🚨" />
        <SummaryCard label="Critical"    value={stats.critical}   color="red"    icon="⚠️" />
      </div>

      {/* Global Alerts */}
      {stats.emergency > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg mb-3 text-sm flex items-center gap-2">
          🚨 <strong>{stats.emergency} emergency test(s)</strong> require immediate attention!
        </div>
      )}
      {stats.critical > 0 && (
        <div className="bg-red-100 border-l-4 border-red-700 text-red-900 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
          ⚠️ <strong>{stats.critical} test(s)</strong> have CRITICAL values — immediate physician notification required!
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <input type="text" placeholder="Search patient, test, doctor…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="All">All Categories</option>
          {TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="All">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Test ID</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Profile / Test</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Critical</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                  No lab tests found. Click "+ New Test Request" to add one.
                </td>
              </tr>
            ) : (
              filtered.map((test) => {
                const hasCrit = test.profileResults && Object.values(test.profileResults).some((r) => r?.isCritical);
                return (
                  <tr key={test.testId} className={hasCrit ? "bg-red-50" : test.priority === "Emergency" ? "bg-orange-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{test.testId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{test.patientName}</p>
                      <p className="text-xs text-gray-400">{test.patientId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {LAB_MASTER_LIBRARY[test.testName] && <span className="text-base">{LAB_MASTER_LIBRARY[test.testName].icon}</span>}
                        <span className="font-medium text-gray-700">{test.testName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{test.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityColor[test.priority]}`}>{test.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">Dr. {test.requestedBy}</td>
                    <td className="px-4 py-3 text-gray-500">{test.requestDate}</td>
                    <td className="px-4 py-3">
                      <select value={test.status} onChange={(e) => updateStatus(test.testId, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${statusColor[test.status]}`}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {hasCrit && <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">⚠️ Critical</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => setViewingTest(test)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded transition">View</button>
                        <button onClick={() => openEditForm(test)}   className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-2 py-1 rounded transition">Edit</button>
                        <button onClick={() => downloadLabReportPDF(test)} className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 px-2 py-1 rounded transition">PDF</button>
                        <button onClick={() => handleDelete(test.testId)} className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 px-2 py-1 rounded transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            Showing {filtered.length} of {tests.length} test(s)
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white">{editingId ? "✏️ Edit Lab Test" : "➕ New Test Request"}</h2>
              <button onClick={closeForm} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

              <LabeledField label="Test ID" name="testId" value={form.testId} disabled />

              {/* Patient selector */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Patient *</label>
                <select value={form.patientId}
                  onChange={(e) => {
                    const patient = patients.find((p) => p.id === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      patientId:     patient?.id     || "",
                      patientName:   patient?.name   || "",
                      patientGender: patient?.gender || "",
                      patientAge:    patient?.age    || "",
                    }));
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Select Patient</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.id} – {p.name}</option>)}
                </select>
              </div>

              <LabeledField label="Patient ID" name="patientId" value={form.patientId} disabled />

              {/* Show patient gender & age if available */}
              {form.patientGender && (
                <div className="sm:col-span-2 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs text-indigo-700 flex gap-4">
                  <span>Gender: <strong>{form.patientGender}</strong></span>
                  {form.patientAge && <span>Age: <strong>{form.patientAge} yrs</strong></span>}
                  <span className="text-indigo-500 italic">(Gender-specific reference ranges will be applied where available)</span>
                </div>
              )}

              {/* Lab Profile selector */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Lab Profile *</label>
                <select name="testName" value={form.testName} onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Select Lab Profile…</option>
                  {Object.entries(LAB_MASTER_LIBRARY).map(([key, def]) => (
                    <option key={key} value={key}>{def.icon} {def.label}</option>
                  ))}
                </select>
              </div>

              {/* Profile info card */}
              {activeProfileDef && (
                <div className="sm:col-span-2 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-start gap-3">
                  <span className="text-2xl">{activeProfileDef.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">{activeProfileDef.label}</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Sample: {activeProfileDef.sampleType}</p>
                    <p className="text-xs text-indigo-500 mt-1">Tests included: {Object.keys(activeProfileDef.tests).join(", ")}</p>
                  </div>
                </div>
              )}

              {/* Critical alert in form */}
              {formHasCritical && (
                <div className="sm:col-span-2">
                  <CriticalAlertBanner profileResults={form.profileResults} />
                </div>
              )}

              {/* Dynamic profile result inputs */}
              {activeProfileDef && (
                <div className="sm:col-span-2">
                  <h3 className="font-semibold text-gray-800 mb-3">Enter Test Values</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(activeProfileDef.tests).map(([testName, refDef]) => {
                      const result     = form.profileResults?.[testName] || {};
                      const badgeClass = statusBadgeClass[result.status] || "bg-gray-100 text-gray-600";
                      return (
                        <div key={testName} className={`rounded-xl border p-3 ${result.status?.startsWith("Critical") ? "bg-red-50 border-red-300" : isAbnormal(result) ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-gray-700 leading-tight">{refDef.professionalName || testName}</label>
                            <span className="text-xs text-gray-400">{refDef.unit || ""}</span>
                          </div>
                          <input type="number" value={result.value || ""}
                            onChange={(e) => handleProfileResultChange(form.testName, testName, e.target.value)}
                            placeholder={`${refDef.min}–${refDef.max === 999 ? "+" : refDef.max} ${refDef.unit || ""}`}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                          {result.status && (
                            <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}>{result.status}</span>
                              <span className="text-xs text-gray-400">Ref: {result.referenceRange || "—"}</span>
                            </div>
                          )}
                          {result.interpretation && result.status !== "Within Normal Limits" && result.status !== "Normal" && (
                            <p className="mt-1 text-xs text-gray-500 italic">{result.interpretation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <LabSummaryPanel profileKey={form.testName} profileResults={form.profileResults} previousResults={form.previousProfileResults} />
                </div>
              )}

              {/* Single result entry (non-library tests) */}
              {!activeProfileDef && (
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Result Value</label>
                  <input type="number" name="result" value={form.result} onChange={handleChange}
                    placeholder="Enter numeric value"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {form.result !== "" && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">Auto Result:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${
                          form.resultStatus === "Within Normal Limits" || form.resultStatus === "Normal" ? "bg-green-600"
                          : form.resultStatus.includes("Decreased") ? "bg-yellow-500"
                          : form.resultStatus.includes("Critical") ? "bg-red-600"
                          : "bg-orange-500"}`}>
                          {form.resultStatus}
                        </span>
                      </div>
                      <p className="text-sm"><strong>Reference:</strong> {form.referenceRange}</p>
                      <p className="text-sm mt-1"><strong>Interpretation:</strong> {form.interpretation}</p>
                    </div>
                  )}
                </div>
              )}

              <LabeledSelect label="Category *" name="category" value={form.category} onChange={handleChange} options={TEST_CATEGORIES} placeholder="Select category…" />
              <LabeledSelect label="Priority"   name="priority" value={form.priority} onChange={handleChange} options={PRIORITY_OPTIONS} />
              <LabeledField  label="Requested By (Doctor) *" name="requestedBy" value={form.requestedBy} onChange={handleChange} placeholder="Doctor name" />
              <LabeledField  label="Request Date *" name="requestDate" value={form.requestDate} onChange={handleChange} type="date" />
              <LabeledField  label="Result Date" name="resultDate" value={form.resultDate} onChange={handleChange} type="date" />
              <LabeledSelect label="Status" name="status" value={form.status} onChange={handleChange} options={STATUS_OPTIONS} />

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Doctor Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange}
                  placeholder="Any additional notes or clinical observations…"
                  rows={3}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow">
                {editingId ? "Save Changes" : "Add Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Result Modal — Hospital Style ───────────────────────────────── */}
      {viewingTest && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewingTest(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-700 to-indigo-500 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-white">🧾 Laboratory Result Report</h2>
                <p className="text-indigo-200 text-xs mt-0.5">{viewingTest.testId} — {viewingTest.testName} — Generated: {nowTime()}</p>
              </div>
              <button onClick={() => setViewingTest(null)} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-6">

              {/* Critical Alert */}
              <CriticalAlertBanner profileResults={viewingTest.profileResults} />

              {/* ── Section 1: Patient Details ── */}
              <section>
                <SectionHeading icon="👤" title="Patient Details" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {[
                    ["Report ID",    viewingTest.testId],
                    ["Patient Name", viewingTest.patientName],
                    ["Patient ID",   viewingTest.patientId || "—"],
                    ["Gender",       viewingTest.patientGender || "—"],
                    ["Profile",      viewingTest.testName],
                    ["Category",     viewingTest.category],
                    ["Priority",     viewingTest.priority],
                    ["Status",       viewingTest.status],
                    ["Ordered By",   `Dr. ${viewingTest.requestedBy}`],
                    ["Request Date", viewingTest.requestDate],
                    ["Result Date",  viewingTest.resultDate || "—"],
                    ["Age",          viewingTest.patientAge ? `${viewingTest.patientAge} yrs` : "—"],
                  ].map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 font-medium">{key}</p>
                      <p className="text-sm text-gray-800 font-semibold mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Section 2: Sample Information ── */}
              <section>
                <SectionHeading icon="🧪" title="Sample Information" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  {[
                    ["Sample Type",     LAB_MASTER_LIBRARY[viewingTest.testName]?.sampleType || viewingTest.sampleType || "—"],
                    ["Barcode",         viewingTest.sampleBarcode || "—"],
                    ["Collected At",    viewingTest.sampleCollectedAt || "—"],
                    ["Received At",     viewingTest.sampleReceivedAt || "—"],
                    ["Processed At",    viewingTest.sampleProcessedAt || "—"],
                    ["Lab Technician",  viewingTest.labTechnicianName || "—"],
                    ["Verifying Doctor",viewingTest.verifyingDoctor || "—"],
                    ["Report Time",     nowTime()],
                  ].map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 font-medium">{key}</p>
                      <p className="text-sm text-gray-800 font-semibold mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Section 3: Profile Results ── */}
              <section>
                <SectionHeading icon={LAB_MASTER_LIBRARY[viewingTest.testName]?.icon || "🔬"} title="Profile Results" />
                <div className="mt-3">
                  {viewingTest.profileResults && Object.keys(viewingTest.profileResults).length > 0 ? (
                    <ProfileResultsTable
                      profileResults={viewingTest.profileResults}
                      profileKey={viewingTest.testName}
                      previousResults={viewingTest.previousProfileResults || {}}
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4 text-gray-700 whitespace-pre-wrap text-sm">
                      {viewingTest.result || "No result entered yet."}
                    </div>
                  )}
                </div>
              </section>

              {/* ── Section 4: Clinical Interpretation ── */}
              {viewingTest.profileResults && Object.keys(viewingTest.profileResults).length > 0 && (() => {
                const summary = generateProfileSummary(viewingTest.testName, viewingTest.profileResults, viewingTest.previousProfileResults || {});
                if (summary.clinicalPatterns.length === 0) return null;
                return (
                  <section>
                    <SectionHeading icon="🧬" title="Clinical Interpretation" />
                    <div className="mt-3 space-y-2">
                      {summary.clinicalPatterns.map(({ id, pattern }) => (
                        <div key={id} className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                          {pattern}
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 italic">
                        Pattern recognition is based on combined parameter analysis. Clinical correlation is mandatory. This does not constitute a medical diagnosis.
                      </p>
                    </div>
                  </section>
                );
              })()}

              {/* ── Section 5: Overall Laboratory Impression ── */}
              {viewingTest.profileResults && Object.keys(viewingTest.profileResults).length > 0 && (
                <section>
                  <SectionHeading icon="📋" title="Overall Laboratory Impression" />
                  <LabSummaryPanel
                    profileKey={viewingTest.testName}
                    profileResults={viewingTest.profileResults}
                    previousResults={viewingTest.previousProfileResults || {}}
                  />
                </section>
              )}

              {/* ── Section 6: Doctor Notes ── */}
              {viewingTest.notes && (
                <section>
                  <SectionHeading icon="📝" title="Doctor Notes" />
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {viewingTest.notes}
                  </div>
                </section>
              )}

              {/* ── Section 7: AI Architecture Stub ── */}
              <section>
                <SectionHeading icon="🤖" title="AI Doctor Assistant" badge="Coming Soon" />
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: "📑", label: "Automatic Clinical Notes", desc: "AI-generated clinical narrative based on all result parameters." },
                    { icon: "🔀", label: "Differential Diagnosis Suggestions", desc: "AI-assisted list of possible diagnoses based on laboratory patterns." },
                    { icon: "📈", label: "Previous Report AI Comparison", desc: "Trend analysis and interpretation across multiple reports." },
                    { icon: "⚠️", label: "Disease Risk Prediction", desc: "Risk scores for common conditions based on multi-parameter analysis." },
                  ].map(({ icon, label, desc }) => (
                    <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex gap-3 items-start opacity-60">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Section 8: Laboratory Disclaimer ── */}
              <section>
                <div className="bg-gray-100 rounded-xl px-4 py-4 text-xs text-gray-500 italic border border-gray-200">
                  <p className="font-semibold text-gray-600 not-italic mb-1">⚕️ Laboratory Disclaimer</p>
                  This report has been generated by MediCare Pro Laboratory Information System and is intended for use by qualified medical professionals only. All results must be interpreted in the appropriate clinical context. Reference ranges are general adult guidelines and may vary with age, gender, and laboratory-specific methodology. Pattern-based interpretations are algorithmic suggestions and do not constitute a medical diagnosis. The attending physician bears final clinical responsibility for all diagnostic and therapeutic decisions. This is a confidential medical document.
                </div>
              </section>
            </div>

            <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50 rounded-b-2xl">
              <button onClick={() => downloadLabReportPDF(viewingTest)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition">
                📄 Download PDF
              </button>
              <button onClick={() => setViewingTest(null)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Shared Small Components ──────────────────────────────────────────────────

function SectionHeading({ icon, title, badge }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
      <span className="text-base">{icon}</span>
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
      {badge && (
        <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">{badge}</span>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon }) {
  const colorMap = {
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    green:  "bg-green-50 text-green-700 border-green-200",
    red:    "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}

function LabeledField({ label, name, value, onChange, type = "text", placeholder, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`} />
    </div>
  );
}

function LabeledSelect({ label, name, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select name={name} value={value} onChange={onChange}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

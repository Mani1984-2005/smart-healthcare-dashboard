export const LAB_MASTER_LIBRARY = {
  CBC: {
    label: "Complete Blood Count",
    icon: "🩸",
    sampleType: "Blood (EDTA)",
    tests: {
      Hemoglobin:  { unit:"g/dL",min:13,max:17,criticalLow:7,criticalHigh:20,lowText:"Hemoglobin concentration is below the expected reference range. Anemia or blood loss should be considered.",highText:"Hemoglobin concentration is above the expected reference range. Polycythemia or dehydration may be present.",genderRanges:{ male:{min:13.5,max:17.5}, female:{min:12,max:15.5} },professionalName:"Hemoglobin" },
      RBC:         { unit:"million/µL",min:4.5,max:5.9,criticalLow:2,criticalHigh:8,lowText:"Red blood cell count is below reference range. Anemia or chronic blood loss is possible.",highText:"Red blood cell count is above reference range. Polycythemia or dehydration is possible.",professionalName:"Red Blood Cell Count" },
      WBC:         { unit:"cells/µL",min:4000,max:11000,criticalLow:2000,criticalHigh:30000,lowText:"White blood cell count is below the lower limit of normal. Immunosuppression or bone marrow pathology should be evaluated.",highText:"White blood cell count is above the upper limit of normal. Infection, inflammation, or hematological malignancy should be excluded.",professionalName:"White Blood Cell Count" },
      Neutrophils: { unit:"%",min:40,max:75,criticalLow:null,criticalHigh:null,lowText:"Neutrophil percentage is below reference range. Viral infection or drug effect possible.",highText:"Neutrophil percentage is above reference range. Bacterial infection or physiological stress possible.",professionalName:"Neutrophils" },
      Platelets:   { unit:"lakh/µL",min:1.5,max:4.5,criticalLow:0.5,criticalHigh:10,lowText:"Platelet count is below the lower limit of normal. Bleeding risk is elevated. Immediate clinical evaluation is advised.",highText:"Platelet count is above the upper limit of normal. Thrombocytosis, reactive or primary, should be evaluated.",professionalName:"Platelet Count" },
      Hematocrit:  { unit:"%",min:41,max:53,criticalLow:20,criticalHigh:60,lowText:"Hematocrit is below reference range. Anemia is suspected.",highText:"Hematocrit is above reference range. Dehydration or polycythemia is possible.",professionalName:"Hematocrit" },
      MCV:         { unit:"fL",min:80,max:100,criticalLow:60,criticalHigh:120,lowText:"Mean corpuscular volume is below reference range. Microcytic process (iron deficiency, thalassemia) is suggested.",highText:"Mean corpuscular volume is above reference range. Macrocytic process (B12/folate deficiency) is suggested.",professionalName:"Mean Corpuscular Volume (MCV)" },
      MCH:         { unit:"pg",min:27,max:33,criticalLow:18,criticalHigh:40,lowText:"Mean corpuscular hemoglobin is below reference range. Hypochromic anemia is possible.",highText:"Mean corpuscular hemoglobin is above reference range. Macrocytic process is possible.",professionalName:"Mean Corpuscular Hemoglobin (MCH)" },
      MCHC:        { unit:"g/dL",min:32,max:36,criticalLow:25,criticalHigh:40,lowText:"Mean corpuscular hemoglobin concentration is below reference range. Hypochromic anemia is indicated.",highText:"MCHC is above reference range. Spherocytosis or laboratory artifact should be considered.",professionalName:"Mean Corpuscular Hgb Concentration (MCHC)" },
    },
  },

  LFT: {
    label: "Liver Function Test",
    icon: "🫀",
    sampleType: "Blood (Serum)",
    tests: {
      "Bilirubin Total":  { unit:"mg/dL", min:0.1,max:1.2,criticalLow:null,criticalHigh:15,lowText:"Total bilirubin is below reference range. Generally not clinically significant.",highText:"Total bilirubin is above reference range. Jaundice, haemolytic disease, or hepatocellular pathology should be excluded.",professionalName:"Total Bilirubin" },
      "Bilirubin Direct": { unit:"mg/dL", min:0,max:0.3,criticalLow:null,criticalHigh:5,lowText:"Direct bilirubin is within acceptable limits.",highText:"Direct bilirubin is elevated. Obstructive jaundice or hepatocellular disease is possible.",professionalName:"Direct (Conjugated) Bilirubin" },
      SGOT:              { unit:"U/L", min:10,max:40,criticalLow:null,criticalHigh:1000,lowText:"Serum glutamic-oxaloacetic transaminase is within physiological range.",highText:"SGOT/AST is elevated. Hepatocellular injury, myocardial infarction, or skeletal muscle damage should be evaluated.",professionalName:"SGOT / AST" },
      SGPT:              { unit:"U/L", min:7,max:56,criticalLow:null,criticalHigh:1000,lowText:"Serum glutamic-pyruvic transaminase is within physiological range.",highText:"SGPT/ALT is elevated. Viral hepatitis or liver parenchymal damage is suspected.",professionalName:"SGPT / ALT" },
      ALP:               { unit:"U/L", min:44,max:147,criticalLow:null,criticalHigh:500,lowText:"Alkaline phosphatase is below reference range. Hypothyroidism or pernicious anaemia should be considered.",highText:"Alkaline phosphatase is elevated. Cholestatic liver disease or bone pathology should be evaluated.",professionalName:"Alkaline Phosphatase (ALP)" },
      Albumin:           { unit:"g/dL", min:3.5,max:5,criticalLow:2,criticalHigh:null,lowText:"Serum albumin is below reference range. Malnutrition, liver disease, or nephrotic syndrome should be considered.",highText:"Albumin is above reference range. Dehydration is possible.",professionalName:"Serum Albumin" },
      "Total Protein":   { unit:"g/dL", min:6.3,max:8.2,criticalLow:4,criticalHigh:10,lowText:"Total protein is below reference range. Malnutrition or hepatic dysfunction is possible.",highText:"Total protein is above reference range. Dehydration or chronic inflammatory condition should be evaluated.",professionalName:"Total Protein" },
    },
  },

  KFT: {
    label: "Kidney Function Test",
    icon: "🫘",
    sampleType: "Blood (Serum)",
    tests: {
      Urea:         { unit:"mg/dL", min:7,max:20,criticalLow:null,criticalHigh:100,lowText:"Blood urea is below reference range. Low protein intake or hepatic disease should be considered.",highText:"Blood urea is elevated. Renal impairment or volume depletion should be evaluated.",professionalName:"Blood Urea" },
      Creatinine:   { unit:"mg/dL", min:0.6,max:1.2,criticalLow:null,criticalHigh:10,lowText:"Serum creatinine is below reference range. Reduced muscle mass is possible.",highText:"Serum creatinine is elevated. Renal insufficiency or acute kidney injury should be excluded.",professionalName:"Serum Creatinine" },
      "Uric Acid":  { unit:"mg/dL", min:3.4,max:7.0,criticalLow:null,criticalHigh:13,lowText:"Uric acid is below reference range. Medication effect is possible.",highText:"Uric acid is above reference range. Hyperuricaemia with risk of gout or renal calculi.",professionalName:"Serum Uric Acid" },
      Sodium:       { unit:"mEq/L", min:136,max:145,criticalLow:120,criticalHigh:160,lowText:"Serum sodium is below reference range. Hyponatraemia should be evaluated clinically.",highText:"Serum sodium is above reference range. Hypernatraemia due to dehydration or excess solute intake.",professionalName:"Serum Sodium" },
      Potassium:    { unit:"mEq/L", min:3.5,max:5.0,criticalLow:2.5,criticalHigh:6.5,lowText:"Serum potassium is below reference range. Hypokalaemia with cardiac rhythm risk should be evaluated.",highText:"Serum potassium is above reference range. Hyperkalaemia with risk of cardiac arrhythmia.",professionalName:"Serum Potassium" },
      Chloride:     { unit:"mEq/L", min:98,max:107,criticalLow:80,criticalHigh:120,lowText:"Serum chloride is below reference range. Hypochloraemia should be evaluated.",highText:"Serum chloride is above reference range. Hyperchloraemia is present.",professionalName:"Serum Chloride" },
    },
  },

  "Lipid Profile": {
    label: "Lipid Profile",
    icon: "💛",
    sampleType: "Blood (Serum \u2013 Fasting 12h)",
    tests: {
      "Total Cholesterol": { unit:"mg/dL", min:0,max:200,criticalLow:null,criticalHigh:300,lowText:"Total cholesterol is within acceptable limits.",highText:"Total cholesterol is above the desirable range. Cardiovascular risk stratification and lifestyle modification are recommended.",professionalName:"Total Cholesterol" },
      HDL:                { unit:"mg/dL", min:40,max:999,criticalLow:25,criticalHigh:null,lowText:"HDL cholesterol is below the protective threshold. Increased cardiovascular risk.",highText:"HDL cholesterol is above reference range. Generally considered cardioprotective.",professionalName:"HDL Cholesterol" },
      LDL:                { unit:"mg/dL", min:0,max:100,criticalLow:null,criticalHigh:190,lowText:"LDL cholesterol is within optimal range.",highText:"LDL cholesterol is above optimal range. Cardiovascular risk is elevated. Lipid-lowering therapy may be indicated.",professionalName:"LDL Cholesterol" },
      Triglycerides:      { unit:"mg/dL", min:0,max:150,criticalLow:null,criticalHigh:500,lowText:"Triglycerides are within normal physiological range.",highText:"Triglycerides are elevated. Hypertriglyceridaemia with risk of pancreatitis at very high levels.",professionalName:"Serum Triglycerides" },
      VLDL:               { unit:"mg/dL", min:2,max:30,criticalLow:null,criticalHigh:80,lowText:"VLDL cholesterol is within normal range.",highText:"VLDL cholesterol is elevated. Associated with hypertriglyceridaemia.",professionalName:"VLDL Cholesterol" },
    },
  },

  "Thyroid Profile": {
    label: "Thyroid Profile",
    icon: "🦋",
    sampleType: "Blood (Serum)",
    tests: {
      T3:  { unit:"ng/dL", min:80,max:200,criticalLow:null,criticalHigh:null,lowText:"Total triiodothyronine is below reference range. Hypothyroidism or non-thyroidal illness should be considered.",highText:"Total triiodothyronine is above reference range. Hyperthyroidism or exogenous hormone excess.",professionalName:"Total T3 (Triiodothyronine)" },
      T4:  { unit:"\u00b5g/dL", min:5,max:12,criticalLow:null,criticalHigh:null,lowText:"Total thyroxine is below reference range. Primary or secondary hypothyroidism should be evaluated.",highText:"Total thyroxine is above reference range. Hyperthyroidism should be considered.",professionalName:"Total T4 (Thyroxine)" },
      TSH: { unit:"mIU/L", min:0.4,max:4.0,criticalLow:0.01,criticalHigh:10,lowText:"Thyroid-stimulating hormone is below reference range. Hyperthyroidism or excess thyroid hormone supplementation.",highText:"Thyroid-stimulating hormone is above reference range. Primary hypothyroidism. Thyroid replacement therapy review is recommended.",professionalName:"Thyroid-Stimulating Hormone (TSH)" },
    },
  },

  "Diabetes Profile": {
    label: "Diabetes Profile",
    icon: "🍬",
    sampleType: "Blood (Serum \u2013 Fasting required for FBS)",
    tests: {
      "Fasting Blood Sugar": { unit:"mg/dL", min:70,max:99,criticalLow:40,criticalHigh:500,lowText:"Fasting blood glucose is below reference range. Hypoglycaemia. Immediate clinical evaluation is advised if symptomatic.",highText:"Fasting blood glucose is above normal range. Diabetes mellitus or impaired fasting glucose should be evaluated.",professionalName:"Fasting Blood Glucose (FBS)" },
      "PP Blood Sugar":      { unit:"mg/dL", min:70,max:140,criticalLow:40,criticalHigh:500,lowText:"Post-prandial glucose is below reference range.",highText:"Post-prandial glucose is above reference range. Post-prandial hyperglycaemia or glucose intolerance.",professionalName:"Post-Prandial Blood Glucose (PPBS)" },
      HbA1c:                { unit:"%", min:0,max:5.7,criticalLow:null,criticalHigh:14,lowText:"Glycated haemoglobin is within normal range.",highText:"Glycated haemoglobin is above the normal range. Suboptimal glycaemic control. Antidiabetic therapy review is recommended.",professionalName:"Glycated Haemoglobin (HbA1c)" },
    },
  },

  "Urine Routine": {
    label: "Urine Routine Examination",
    icon: "🔬",
    sampleType: "Urine (Mid-stream)",
    tests: {
      pH:                { unit:"", min:4.5,max:8.0,criticalLow:null,criticalHigh:null,lowText:"Urine pH is in the acidic range.",highText:"Urine pH is in the alkaline range.",professionalName:"Urine pH" },
      "Specific Gravity": { unit:"", min:1.001,max:1.030,criticalLow:null,criticalHigh:null,lowText:"Specific gravity is low. Dilute urine is noted.",highText:"Specific gravity is high. Concentrated urine is noted.",professionalName:"Specific Gravity" },
      Protein:           { unit:"mg/dL", min:0,max:8,criticalLow:null,criticalHigh:300,lowText:"Urine protein is within normal limits.",highText:"Proteinuria is present. Nephrotic syndrome or glomerulonephritis should be evaluated.",professionalName:"Urine Protein" },
      Glucose:           { unit:"mg/dL", min:0,max:15,criticalLow:null,criticalHigh:1000,lowText:"Urine glucose is within normal limits.",highText:"Glucosuria is present. Uncontrolled diabetes mellitus or renal threshold abnormality should be excluded.",professionalName:"Urine Glucose" },
      RBC:               { unit:"/HPF", min:0,max:2,criticalLow:null,criticalHigh:50,lowText:"Red blood cells in urine are within normal limits.",highText:"Haematuria is present. Urinary tract infection, nephrolithiasis, or glomerulonephritis should be considered.",professionalName:"RBC in Urine" },
      "Pus Cells":       { unit:"/HPF", min:0,max:5,criticalLow:null,criticalHigh:50,lowText:"Pus cells are within normal limits.",highText:"Pyuria is present. Urinary tract infection is suspected.",professionalName:"Pus Cells (WBC in Urine)" },
    },
  },

  Electrolytes: {
    label: "Serum Electrolytes",
    icon: "⚡",
    sampleType: "Blood (Serum)",
    tests: {
      Sodium:      { unit:"mEq/L", min:136,max:145,criticalLow:120,criticalHigh:160,lowText:"Hyponatraemia is present.",highText:"Hypernatraemia is present.",professionalName:"Serum Sodium" },
      Potassium:   { unit:"mEq/L", min:3.5,max:5.0,criticalLow:2.5,criticalHigh:6.5,lowText:"Hypokalaemia with cardiac risk is present.",highText:"Hyperkalaemia with arrhythmia risk is present.",professionalName:"Serum Potassium" },
      Chloride:    { unit:"mEq/L", min:98,max:107,criticalLow:80,criticalHigh:120,lowText:"Hypochloraemia is present.",highText:"Hyperchloraemia is present.",professionalName:"Serum Chloride" },
      Bicarbonate: { unit:"mEq/L", min:22,max:29,criticalLow:10,criticalHigh:40,lowText:"Bicarbonate is below reference range. Metabolic acidosis should be evaluated.",highText:"Bicarbonate is above reference range. Metabolic alkalosis should be evaluated.",professionalName:"Serum Bicarbonate" },
      Calcium:     { unit:"mg/dL", min:8.5,max:10.5,criticalLow:6.5,criticalHigh:13,lowText:"Hypocalcaemia is present. Tetany risk should be assessed.",highText:"Hypercalcaemia is present. Malignancy or hyperparathyroidism should be excluded.",professionalName:"Serum Calcium" },
      Phosphorus:  { unit:"mg/dL", min:2.5,max:4.5,criticalLow:null,criticalHigh:9,lowText:"Serum phosphorus is below reference range.",highText:"Serum phosphorus is above reference range. Renal disease should be evaluated.",professionalName:"Serum Phosphorus" },
    },
  },

  "Infection Panel": {
    label: "Infection Panel",
    icon: "🦠",
    sampleType: "Blood (Serum)",
    tests: {
      CRP:              { unit:"mg/L", min:0,max:5,criticalLow:null,criticalHigh:200,lowText:"C-reactive protein is within normal physiological limits.",highText:"C-reactive protein is elevated. Active infection or systemic inflammation is present.",professionalName:"C-Reactive Protein (CRP)" },
      ESR:              { unit:"mm/hr", min:0,max:20,criticalLow:null,criticalHigh:100,lowText:"Erythrocyte sedimentation rate is within normal range.",highText:"ESR is elevated. Infection, inflammatory condition, or malignancy should be evaluated.",professionalName:"Erythrocyte Sedimentation Rate (ESR)" },
      Procalcitonin:    { unit:"ng/mL", min:0,max:0.5,criticalLow:null,criticalHigh:10,lowText:"Procalcitonin is within normal limits.",highText:"Procalcitonin is markedly elevated. Bacterial sepsis is highly probable. Immediate clinical intervention is indicated.",professionalName:"Procalcitonin" },
      "Widal Test (O)": { unit:"titre", min:0,max:1,criticalLow:null,criticalHigh:null,lowText:"Widal O antigen titre is non-reactive.",highText:"Widal O antigen titre is reactive. Typhoid fever (Salmonella typhi) should be considered.",professionalName:"Widal Test (O Antigen)" },
      "Widal Test (H)": { unit:"titre", min:0,max:1,criticalLow:null,criticalHigh:null,lowText:"Widal H antigen titre is non-reactive.",highText:"Widal H antigen titre is reactive. Typhoid fever should be considered.",professionalName:"Widal Test (H Antigen)" },
      "Malaria Antigen": { unit:"", min:0,max:0,criticalLow:null,criticalHigh:null,lowText:"Malaria rapid antigen test is non-reactive.",highText:"Malaria rapid antigen test is reactive. Malaria is detected. Immediate treatment initiation is required.",professionalName:"Malaria Rapid Antigen" },
    },
  },

  "Vitamin Profile": {
    label: "Vitamin Profile",
    icon: "💊",
    sampleType: "Blood (Serum)",
    tests: {
      "Vitamin D":   { unit:"ng/mL", min:30,max:100,criticalLow:10,criticalHigh:150,lowText:"25-hydroxyvitamin D is below the sufficient range. Vitamin D deficiency. Supplementation and sun exposure are recommended.",highText:"25-hydroxyvitamin D is above normal range. Vitamin D toxicity should be evaluated.",professionalName:"25-OH Vitamin D" },
      "Vitamin B12": { unit:"pg/mL", min:200,max:900,criticalLow:100,criticalHigh:null,lowText:"Serum cobalamin is below reference range. Vitamin B12 deficiency with risk of neuropathy and megaloblastic anaemia.",highText:"Serum cobalamin is above reference range. Often reflects supplementation. Rarely clinically significant.",professionalName:"Serum Cobalamin (Vitamin B12)" },
      "Vitamin B6":  { unit:"µg/L", min:5,max:50,criticalLow:null,criticalHigh:200,lowText:"Pyridoxine level is below reference range. Neuropathy risk.",highText:"Pyridoxine level is above reference range. Peripheral neurotoxicity is possible at very high concentrations.",professionalName:"Pyridoxine (Vitamin B6)" },
      Folate:        { unit:"ng/mL", min:2.7,max:17,criticalLow:2,criticalHigh:null,lowText:"Serum folate is below reference range. Megaloblastic anaemia and neural tube defect risk.",highText:"Serum folate is above reference range. Generally from supplementation. Not clinically harmful.",professionalName:"Serum Folate" },
      "Vitamin A":   { unit:"µg/dL", min:20,max:60,criticalLow:null,criticalHigh:200,lowText:"Retinol level is below reference range. Vitamin A deficiency with night blindness risk.",highText:"Retinol level is above reference range. Vitamin A toxicity (hypervitaminosis A) should be evaluated.",professionalName:"Serum Retinol (Vitamin A)" },
    },
  },
};

export const CLINICAL_PATTERNS = {
  CBC: [
    { id:"iron_deficiency_anemia", conditions:(r) => statusLow(r?.Hemoglobin) && statusLow(r?.MCV) && statusLow(r?.MCH) && statusLow(r?.MCHC), pattern:"Pattern is suggestive of Iron Deficiency Anaemia (microcytic hypochromic pattern). Clinical correlation and serum iron studies are recommended." },
    { id:"megaloblastic_anemia", conditions:(r) => statusLow(r?.Hemoglobin) && statusHigh(r?.MCV) && statusHigh(r?.MCH), pattern:"Pattern is suggestive of Megaloblastic Anaemia (macrocytic pattern). Vitamin B12 and folate levels should be evaluated." },
    { id:"hemolytic_anemia", conditions:(r) => statusLow(r?.Hemoglobin) && statusHigh(r?.MCV) && statusHigh(r?.MCHC), pattern:"Pattern may be suggestive of Haemolytic Anaemia or Spherocytosis. Peripheral blood smear and reticulocyte count are recommended." },
    { id:"bacterial_infection", conditions:(r) => statusHigh(r?.WBC) && statusHigh(r?.Neutrophils), pattern:"Pattern is suggestive of Bacterial Infection or Neutrophilia. Acute phase reactants and clinical assessment are recommended." },
    { id:"viral_infection", conditions:(r) => statusHigh(r?.WBC) && !statusHigh(r?.Neutrophils), pattern:"Pattern may be suggestive of Viral Infection or Lymphocytosis. Clinical history and differential count are recommended." },
    { id:"thrombocytopenia", conditions:(r) => statusCritical(r?.Platelets), pattern:"Pattern is suggestive of Thrombocytopenia. Bleeding risk is elevated. Immediate physician notification and clinical evaluation are required." },
    { id:"pancytopenia", conditions:(r) => statusLow(r?.Hemoglobin) && statusLow(r?.WBC) && statusLow(r?.Platelets), pattern:"Pattern may be suggestive of Pancytopenia. Bone marrow pathology or aplastic anaemia should be excluded. Urgent haematology review is recommended." },
  ],
  LFT: [
    { id:"hepatocellular_damage", conditions:(r) => statusHigh(r?.SGOT) && statusHigh(r?.SGPT), pattern:"Pattern is suggestive of Hepatocellular Injury. Viral hepatitis, toxic hepatopathy, or ischaemic hepatitis should be excluded." },
    { id:"cholestasis", conditions:(r) => statusHigh(r?.ALP) && statusHigh(r?.["Bilirubin Total"]), pattern:"Pattern may be suggestive of Cholestatic Liver Disease or Obstructive Jaundice. Biliary imaging is recommended." },
    { id:"hypoalbuminemia", conditions:(r) => statusLow(r?.Albumin) && statusLow(r?.["Total Protein"]), pattern:"Pattern is suggestive of Hypoalbuminaemia with Protein Deficiency. Malnutrition or hepatic synthetic dysfunction should be evaluated." },
  ],
  KFT: [
    { id:"renal_impairment", conditions:(r) => statusHigh(r?.Urea) && statusHigh(r?.Creatinine), pattern:"Pattern is suggestive of Renal Impairment (azotaemia). Acute kidney injury or chronic kidney disease should be evaluated." },
    { id:"hyperkalemia_risk", conditions:(r) => statusCritical(r?.Potassium), pattern:"Pattern is suggestive of Critical Hyperkalaemia. Cardiac arrhythmia risk is elevated. Immediate physician notification is required." },
    { id:"hyperuricemia_gout", conditions:(r) => statusHigh(r?.["Uric Acid"]) && statusHigh(r?.Creatinine), pattern:"Pattern may be suggestive of Hyperuricaemia associated with Renal Insufficiency. Gout prophylaxis and renal function monitoring are recommended." },
  ],
  "Lipid Profile": [
    { id:"high_cv_risk", conditions:(r) => statusHigh(r?.LDL) && statusHigh(r?.["Total Cholesterol"]) && statusLow(r?.HDL), pattern:"Pattern is suggestive of High Cardiovascular Risk Dyslipidaemia. Lipid-lowering therapy and lifestyle modification are strongly recommended." },
    { id:"hypertriglyceridemia", conditions:(r) => statusHigh(r?.Triglycerides) && statusHigh(r?.VLDL), pattern:"Pattern is suggestive of Primary Hypertriglyceridaemia. Pancreatitis risk should be assessed at very high levels." },
  ],
  "Thyroid Profile": [
    { id:"hypothyroidism", conditions:(r) => statusHigh(r?.TSH) && statusLow(r?.T4), pattern:"Pattern is suggestive of Primary Hypothyroidism. Thyroid hormone replacement therapy review is recommended." },
    { id:"hyperthyroidism", conditions:(r) => statusLow(r?.TSH) && statusHigh(r?.T4), pattern:"Pattern is suggestive of Primary Hyperthyroidism. Anti-thyroid therapy or radioiodine evaluation may be indicated." },
    { id:"subclinical_hypothyroidism", conditions:(r) => statusHigh(r?.TSH) && !statusLow(r?.T4), pattern:"Pattern may be suggestive of Subclinical Hypothyroidism. Clinical monitoring and thyroid antibody evaluation are recommended." },
  ],
  "Diabetes Profile": [
    { id:"uncontrolled_diabetes", conditions:(r) => statusHigh(r?.["Fasting Blood Sugar"]) && statusHigh(r?.HbA1c), pattern:"Pattern is suggestive of Poorly Controlled Diabetes Mellitus. Antidiabetic medication review and dietary counselling are recommended." },
    { id:"impaired_fasting_glucose", conditions:(r) => statusHigh(r?.["Fasting Blood Sugar"]) && !statusHigh(r?.HbA1c), pattern:"Pattern may be suggestive of Impaired Fasting Glucose or Pre-diabetes. Lifestyle intervention and repeat testing are recommended." },
  ],
  "Infection Panel": [
    { id:"bacterial_sepsis", conditions:(r) => statusHigh(r?.CRP) && statusHigh(r?.Procalcitonin), pattern:"Pattern is strongly suggestive of Bacterial Sepsis. Procalcitonin elevation combined with elevated CRP is a critical finding. Immediate physician notification and blood culture are required." },
    { id:"typhoid_fever", conditions:(r) => statusHigh(r?.["Widal Test (O)"]) && statusHigh(r?.["Widal Test (H)"]), pattern:"Pattern is suggestive of Typhoid Fever (Salmonella typhi). Clinical correlation with fever history and blood culture confirmation are recommended." },
  ],
  "Vitamin Profile": [
    { id:"dual_deficiency", conditions:(r) => statusLow(r?.["Vitamin D"]) && statusLow(r?.["Vitamin B12"]), pattern:"Pattern is suggestive of Combined Vitamin D and Vitamin B12 Deficiency. Supplementation and dietary assessment are recommended." },
  ],
};

function statusOf(result) {
  return result?.status || "";
}
function statusLow(r)      { const s = statusOf(r); return s.includes("Decreased") || s === "Low"; }
function statusHigh(r)     { const s = statusOf(r); return s.includes("Elevated") || s === "High" || s === "Borderline Elevated"; }
function statusCritical(r) { const s = statusOf(r); return s.startsWith("Critical"); }
function isAbnormal(r) { return statusLow(r) || statusHigh(r) || statusCritical(r); }

export { isAbnormal };

export function runClinicalPatterns(profileKey, profileResults) {
  const patterns = CLINICAL_PATTERNS[profileKey];
  if (!patterns || !profileResults) return [];
  return patterns
    .filter(({ conditions }) => conditions(profileResults))
    .map(({ id, pattern }) => ({ id, pattern }));
}

export function getProfessionalStatus(value, ref) {
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

export function resolveRef(ref, gender) {
  if (gender && ref.genderRanges?.[gender.toLowerCase()]) {
    const gr = ref.genderRanges[gender.toLowerCase()];
    return { ...ref, min: gr.min, max: gr.max };
  }
  return ref;
}

export function judgeTestResult(profileKey, testName, value, gender = "") {
  const profile = LAB_MASTER_LIBRARY[profileKey];
  const rawRef  = profile?.tests?.[testName];
  if (!rawRef || value === "" || Number.isNaN(Number(value))) {
    return { status:"Manual Review", unit:"", referenceRange:"Not available", interpretation:"Reference range not available. Doctor/laboratory review is required.", isCritical:false };
  }
  const ref    = resolveRef(rawRef, gender);
  const num    = Number(value);
  const status = getProfessionalStatus(num, ref);
  const maxDisp = ref.max === 999 ? "+" : ` \u2013 ${ref.max}`;
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

export function judgeLabResult(testName, value) {
  if (value === "" || Number.isNaN(Number(value))) {
    return { status:"Manual Review", unit:"", referenceRange:"Not available", interpretation:"Reference range not available. Doctor/laboratory review is required.", isCritical:false };
  }
  return { status:"Within Normal Limits", unit:"", referenceRange:"Not available", interpretation:"Result has been entered. Physician review is recommended.", isCritical:false };
}

export function computeTrend(currentVal, previousVal) {
  const cur = Number(currentVal);
  const pre = Number(previousVal);
  if (isNaN(cur) || isNaN(pre) || pre === 0) return null;
  const diff = cur - pre;
  const pct  = ((diff / pre) * 100).toFixed(1);
  return { difference: diff.toFixed(2), percentChange: pct, direction: diff > 0.05 * pre ? "up" : diff < -0.05 * pre ? "down" : "stable" };
}

export function generateProfileSummary(profileKey, profileResults, previousResults = {}) {
  if (!profileResults || Object.keys(profileResults).length === 0) {
    return { lines:[], overallImpression:"", hasCritical:false, clinicalPatterns:[] };
  }
  const lines = [], abnormals = [], criticals = [];
  Object.entries(profileResults).forEach(([testName, result]) => {
    if (result?.value === "" || result?.value == null) return;
    const { status, referenceRange } = result;
    const prof = LAB_MASTER_LIBRARY[profileKey]?.tests?.[testName];
    const displayName = prof?.professionalName || testName;
    if (status === "Within Normal Limits") {
      lines.push({ testName, text:`${displayName} is within normal physiological limits.`, status });
    } else if (["Mildly Decreased","Moderately Decreased","Severely Decreased","Borderline Elevated","Moderately Elevated","Markedly Elevated","Low","High"].includes(status)) {
      abnormals.push(displayName);
      lines.push({ testName, text:`${displayName} is ${status.toLowerCase()} (Reference: ${referenceRange}).`, status });
    } else if (status === "Critical Low" || status === "Critical High") {
      criticals.push(displayName);
      lines.push({ testName, text:`CRITICAL: ${displayName} is ${status} (Reference: ${referenceRange}). Immediate physician notification is mandatory.`, status });
    }
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

export const TEST_CATEGORIES = ["Blood Test","Urine Test","X-Ray","MRI","CT Scan","ECG","Ultrasound","Biopsy","Culture & Sensitivity","Other"];
export const STATUS_OPTIONS = ["Pending","In Progress","Completed","Cancelled"];
export const PRIORITY_OPTIONS = ["Routine","Urgent","Emergency"];
export const STORAGE_KEY = "lab_tests";
export const PATIENTS_KEY = "patients";

export const statusBadgeClass = {
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
  Normal:  "bg-green-100 text-green-700",
  Low:     "bg-yellow-100 text-yellow-700",
  High:    "bg-orange-100 text-orange-700",
};

export const statusTableBadgeClass = {
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
  Normal:  "bg-green-100 text-green-700 border-green-200",
  Low:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  High:    "bg-orange-100 text-orange-700 border-orange-200",
};

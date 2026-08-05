// =========================================================
// MEDICARE PRO — Lab ↔ Medicine Safety Correlation Rules (Part 3A)
// =========================================================
// Offline, rule-based correlations between an abnormal lab result and
// medicine categories that warrant caution or review. Mirrors the style
// of data/medicineDatabase.js so it can be extended the same way.
//
// Matching is done on `category` / `medicineKey` substrings against the
// prescription's already-extracted medicines — no external calls.

export const LAB_CORRELATION_RULES = [
  {
    testCodes: ['CREATININE', 'EGFR', 'BUN'],
    abnormalFlags: ['high', 'critical_high', 'low', 'critical_low'],
    riskyCategoryKeywords: ['nsaid', 'aminoglycoside', 'ace inhibitor', 'arb'],
    riskyMedicineKeys: ['ibuprofen', 'metformin'],
    severity: 'major',
    description: (medName) => `${medName} requires renal-function-adjusted dosing or caution — patient has an abnormal renal panel result.`,
  },
  {
    testCodes: ['ALT', 'AST', 'BILIRUBIN', 'LFT'],
    abnormalFlags: ['high', 'critical_high'],
    riskyCategoryKeywords: ['analgesic', 'antipyretic', 'macrolide', 'statin'],
    riskyMedicineKeys: ['paracetamol'],
    severity: 'major',
    description: (medName) => `${medName} carries hepatotoxicity risk — patient has abnormal liver function results.`,
  },
  {
    testCodes: ['INR', 'PT'],
    abnormalFlags: ['high', 'critical_high'],
    riskyCategoryKeywords: ['antiplatelet', 'nsaid'],
    riskyMedicineKeys: ['aspirin'],
    severity: 'contraindicated',
    description: (medName) => `${medName} increases bleeding risk in a patient with an elevated INR/PT.`,
  },
  {
    testCodes: ['POTASSIUM', 'K+'],
    abnormalFlags: ['high', 'critical_high'],
    riskyCategoryKeywords: ['potassium-sparing', 'ace inhibitor', 'arb'],
    riskyMedicineKeys: [],
    severity: 'major',
    description: (medName) => `${medName} can further elevate potassium — patient has hyperkalemia on file.`,
  },
  {
    testCodes: ['HBA1C', 'GLUCOSE', 'FBS', 'RBS'],
    abnormalFlags: ['low', 'critical_low'],
    riskyCategoryKeywords: ['antidiabetic', 'sulfonylurea', 'insulin'],
    riskyMedicineKeys: [],
    severity: 'major',
    description: (medName) => `${medName} risks further hypoglycemia — patient's glucose result is already low.`,
  },
];

/**
 * @param {{testCode:string, abnormalFlag:string}} labReport
 * @param {Array<{genericName:string, medicineKey:string, category:string}>} medicines
 * @returns {Array<{medicineName:string, severity:string, description:string}>}
 */
export function correlateLabWithMedicines(labReport, medicines) {
  const flags = [];
  const testCode = (labReport.testCode || labReport.test_name || '').toUpperCase();
  const abnormalFlag = labReport.abnormalFlag || labReport.abnormal_flag;

  if (!abnormalFlag || abnormalFlag === 'normal') return flags;

  for (const rule of LAB_CORRELATION_RULES) {
    const testMatches = rule.testCodes.some((code) => testCode.includes(code));
    const flagMatches = rule.abnormalFlags.includes(abnormalFlag);
    if (!testMatches || !flagMatches) continue;

    for (const med of medicines) {
      const category = (med.category || '').toLowerCase();
      const key = (med.medicine_key || med.medicineKey || '').toLowerCase();
      const categoryHit = rule.riskyCategoryKeywords.some((kw) => category.includes(kw));
      const keyHit = rule.riskyMedicineKeys.includes(key);
      if (categoryHit || keyHit) {
        flags.push({
          medicineName: med.generic_name || med.genericName,
          severity: rule.severity,
          description: rule.description(med.generic_name || med.genericName),
        });
      }
    }
  }
  return flags;
}

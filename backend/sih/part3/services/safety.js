// Medical-safety constants shared by every response that carries extracted information.
export const SAFETY = Object.freeze({
  verificationStatus: "EXTRACTED_UNVERIFIED",
  generatedBy: "Automated OCR and rule-based extraction",
  notice:
    "Documentation and information-structuring tool. Values were read from OCR text by software and are NOT clinician-confirmed. " +
    "Lab flags compare a result only with the reference range printed in the document. Nothing here is a diagnosis or a clinical decision.",
});
export const withSafety = (payload) => ({ ...payload, safety: SAFETY });

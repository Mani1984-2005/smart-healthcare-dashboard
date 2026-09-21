# Prescription QR Anti-Pattern Fix

**Requested:** fix the prescription QR system, which embedded patient/clinical data directly into QR payloads (flagged repeatedly across the audit and remediation phases). **Found along the way:** two additional, more severe bugs in the same code that had never been caught because this route surface was unreachable until the remediation phase connected it.

## The fix itself

`Prescription.js`'s `buildPrescriptionQR` and `pharmacyController.js`'s separate, duplicate `buildQRPayload` (a genuine "different phases" duplicate — two independent implementations doing the same job, never reconciled) both used to embed `patient_id`, patient name, doctor name, diagnosis, and every medicine's name/dosage/frequency directly into a JSON string. Both removed. Replaced with the exact architecture already proven for Patient QR: an opaque 192-bit random `qr_token` (pure hex, verified in a real unit test to contain none of the old payload's structural characters), stored on the prescription, with three real endpoints — generate image, resolve (authenticated, RBAC-gated), regenerate/revoke.

## Two bugs found while verifying the fix

Neither is related to the QR anti-pattern itself — both were pre-existing defects in code that had simply never run before, discovered because connecting and testing the QR fix required exercising `createPrescription` for the first time.

1. **`import * as Prescription from "../models/Prescription.js"`** — this creates a namespace object shaped `{ Prescription: <the real model>, applyDosageRules: <fn> }`. Every call in the file (`Prescription.create`, `.addMedicine`, `.findById`, `.findByPatient`, `.getAllPrescriptions`, `.updateStatus`, `.deleteMedicine`, `.delete`) was calling a property that doesn't exist one level too shallow — every one of them would throw `"is not a function"`. Confirmed empirically (`typeof mod.create` → `undefined`, `typeof mod.Prescription.create` → `function`) before fixing. Fix: changed to a named import, `import { Prescription } from "..."` — zero other code changes needed, since the rest of the file already assumed that shape.

2. **`Prescription.addMedicine` was called with a fake string ID instead of the real one.** `prescription_items.prescription_id` is `INT NOT NULL REFERENCES prescriptions(id)` — a real foreign key to the numeric primary key. The code was passing `generateRxId()`'s output (`"RX-<timestamp>"`, a string) instead of `prescription.id` (the real integer). This would have failed Postgres's own type checking or the FK constraint on every call — no medicine could ever have been successfully attached to a prescription. Fixed to use the real `prescription.id`; `generateRxId()` itself was dead code (only ever fed the removed QR builder and a silently-ignored field) and was removed.

Together, these meant the entire prescription-management half of the pharmacy module (as opposed to the medicine-inventory half, which used a correct default import and worked) had never functioned at all.

## Verification performed

All three fixes verified together in one real, live sequence against Postgres:
- `POST /api/pharmacy/prescriptions` with two medicines → succeeded for the first time, both items correctly linked via the real numeric `prescription_id`, a real opaque `qr_token` returned, `qr_payload` correctly `null` (legacy, unused).
- QR image generation → real PNG data URL.
- Resolve by token → correct full prescription detail returned only through the authenticated endpoint.
- Regenerate → new token issued; the old token immediately 404s ("may have been regenerated or revoked").
- Anonymous requests to all three new endpoints → `401`.
- Every QR scan/regenerate action → correctly present in the real audit log.

Added 3 new pure unit tests (`Prescription.test.js`: export-shape check that would catch the import bug class again, token opacity, token uniqueness) and added the two new endpoints to the automated anonymous-rejection integration suite. **Full suite: 59/59 passing.** Whole-project lint and build both clean.

## Files changed

`backend/models/Prescription.js`, `backend/models/Prescription.test.js` (new), `backend/controllers/pharmacyController.js`, `backend/controllers/patientController.js` (one stale comment updated), `backend/routes/pharmacyRoutes.js`, `backend/test/integration.test.js`.

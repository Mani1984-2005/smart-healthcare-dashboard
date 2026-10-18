# MediCare Pro — Demo Recovery & Environment Checklist

## 1. Pre-Demo Environment Checks
- **Node & Vite Server**: Ensure the development preview or build preview runs successfully (`npm run dev` or `npm run preview`).
- **Browser Compatibility**: Use a modern browser (Chrome, Edge, or Safari) with JavaScript enabled.
- **Network**: Verify local static asset loading. The app runs as a self-contained SPA frontend.

---

## 2. Safe Application Loading Verification
1. Open the preview URL (`https://ais-dev-pa2ujm3d2tzfujix6opzwn-726302475701.asia-southeast1.run.app` or `http://localhost:3000`).
2. Verify that the Dashboard loads immediately with active summary cards.
3. Click through the primary navigation items (Patients, Appointments, Consultations, Laboratory, Billing) to ensure route rendering is active.

---

## 3. Checkpoint & Workspace Recovery Instructions
- **Workspace State**: The project resides in the managed Google AI Studio environment with automated version control snapshots.
- **Recovery Procedure**: If unexpected browser state issues occur, perform a soft page reload (`Ctrl+R` / `Cmd+R`).
- **Critical Warning**: **Do NOT clear `localStorage` or reset browser site data** as a generic troubleshooting step during or before a demonstration, as this will erase demo patient records and billing history.

---

## 4. Failure Reporting & Documentation Procedure
If an unexpected rendering anomaly or script error occurs during a rehearsal or demonstration:
1. **Do not modify source code or reset storage.**
2. Capture a screenshot of the error state.
3. Record the exact navigation steps leading up to the issue.
4. Document the occurrence in session logs for engineering triage without risking existing demo data.

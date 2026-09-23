/**
 * Canonical hospital workflow context.
 *
 * Single source of truth for resolving live workflow IDs across
 * patient -> appointment -> doctor -> encounter pages.
 *
 * Priority: explicit router state > persisted localStorage > null.
 * Demo IDs (P-1001, ENC-2001, etc.) can NEVER override live IDs.
 */

export interface WorkflowContext {
    appointmentId: string | null;
    patientId: string | null;
    doctorId: string | null;
    encounterId: string | null;
}

const DEMO_PATIENT_IDS = new Set(["P-1001", "P-1002", "P-1004", "P-1003"]);
const DEMO_ENCOUNTER_IDS = new Set(["ENC-2001", "ENC-2002", "ENC-2005"]);

function isDemoPatientId(value: unknown): boolean {
    return typeof value === "string" && DEMO_PATIENT_IDS.has(value.trim());
}

function isDemoEncounterId(value: unknown): boolean {
    return typeof value === "string" && DEMO_ENCOUNTER_IDS.has(value.trim());
}

function clean(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const s = String(value).trim();
    return s.length > 0 ? s : null;
}

function readStored(key: string): Record<string, unknown> | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

/**
 * Resolve the canonical live workflow context.
 * `state` is react-router location.state (may be null on refresh / direct URL).
 */
export function resolveWorkflowContext(state?: Record<string, unknown> | null): WorkflowContext {
    const s = state ?? {};
    const storedAppt = readStored("medicare_selected_appointment");
    const storedEnc = readStored("medicare_selected_encounter");
    const storedPatient = readStored("medicare_selected_patient");

    const appointmentId =
        clean(s.appointmentId) ?? clean(storedAppt?.id) ?? clean(storedAppt?.appointmentId) ?? clean(storedEnc?.appointmentId) ?? null;
    const encounterId =
        clean(s.encounterId) ?? clean(s.id) ?? clean(storedEnc?.id) ?? clean(storedEnc?.encounterId) ?? null;
    const patientId =
        clean(s.patientId) ?? clean(storedAppt?.patientId) ?? clean(storedEnc?.patientId) ?? clean(storedPatient?.id) ?? clean(storedPatient?.patientId) ?? null;
    const doctorId =
        clean(s.doctorId) ?? clean(storedAppt?.doctorId) ?? clean(storedEnc?.doctorId) ?? null;

    // Demo IDs must never silently become the active workflow identity.
    // If the ONLY candidate is a demo ID with no live counterpart, drop it to null
    // so pages show "context unavailable" instead of fake data.
    return {
        appointmentId,
        patientId: patientId && isDemoPatientId(patientId) ? null : patientId,
        doctorId,
        encounterId: encounterId && isDemoEncounterId(encounterId) ? null : encounterId,
    };
}

export function hasLiveContext(ctx: WorkflowContext): boolean {
    return Boolean(ctx.appointmentId || ctx.patientId || ctx.doctorId || ctx.encounterId);
}

export function describeWorkflowContext(ctx: WorkflowContext): string {
    return `appointment ${ctx.appointmentId ?? "—"}, patient ${ctx.patientId ?? "—"}, doctor ${ctx.doctorId ?? "—"}, encounter ${ctx.encounterId ?? "—"}`;
}
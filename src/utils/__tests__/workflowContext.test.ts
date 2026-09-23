import { describe, expect, it, beforeEach } from "vitest";
import { hasLiveContext, resolveWorkflowContext } from "../workflowContext";

beforeEach(() => {
    localStorage.clear();
});

describe("workflowContext canonical identity", () => {
    it("prefers router state over persisted storage", () => {
        localStorage.setItem("medicare_selected_appointment", JSON.stringify({ id: "appt-old", patientId: "42", doctorId: "doc-old" }));
        const ctx = resolveWorkflowContext({ appointmentId: "appt-new", patientId: "7", doctorId: "doc-new", encounterId: "enc-new" });
        expect(ctx.appointmentId).toBe("appt-new");
        expect(ctx.patientId).toBe("7");
        expect(ctx.doctorId).toBe("doc-new");
        expect(ctx.encounterId).toBe("enc-new");
        expect(hasLiveContext(ctx)).toBe(true);
    });

    it("survives refresh via persisted appointment and encounter", () => {
        localStorage.setItem("medicare_selected_appointment", JSON.stringify({ id: "appt-801", patientId: 42, doctorId: "doc-1" }));
        localStorage.setItem("medicare_selected_encounter", JSON.stringify({ id: "enc-801", appointmentId: "appt-801", patientId: 42, doctorId: "doc-1" }));
        const ctx = resolveWorkflowContext(null);
        expect(ctx.appointmentId).toBe("appt-801");
        expect(ctx.patientId).toBe("42");
        expect(ctx.encounterId).toBe("enc-801");
    });

    it("never lets demo patient IDs become the active patient", () => {
        const ctx = resolveWorkflowContext({ patientId: "P-1001", appointmentId: "appt-1" });
        expect(ctx.patientId).toBeNull();
        expect(ctx.appointmentId).toBe("appt-1");
    });

    it("never lets demo encounter IDs become the active encounter", () => {
        const ctx = resolveWorkflowContext({ encounterId: "ENC-2001" });
        expect(ctx.encounterId).toBeNull();
        expect(hasLiveContext(ctx)).toBe(false);
    });

    it("returns empty context when nothing is stored", () => {
        const ctx = resolveWorkflowContext(null);
        expect(ctx).toEqual({ appointmentId: null, patientId: null, doctorId: null, encounterId: null });
        expect(hasLiveContext(ctx)).toBe(false);
    });

    it("selected appointment survives refresh", () => {
        localStorage.setItem("medicare_selected_appointment", JSON.stringify({ id: "appt-999", patientId: "55", doctorId: "doc-9" }));
        const afterRefresh = resolveWorkflowContext(null);
        expect(afterRefresh.appointmentId).toBe("appt-999");
        expect(afterRefresh.patientId).toBe("55");
    });
});
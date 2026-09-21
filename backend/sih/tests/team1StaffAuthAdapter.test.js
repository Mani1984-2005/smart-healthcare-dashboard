import { describe, it, expect, vi, afterEach } from "vitest";
import { team1StaffAuthorizationAdapter, _internal } from "../middleware/team1StaffAuthorizationAdapter.js";

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("team1StaffAuthorizationAdapter — explicit fail-closed behavior", () => {
  const original = { NODE_ENV: process.env.NODE_ENV, FLAG: process.env.TEAM1_DEMO_STAFF_AUTH };
  afterEach(() => {
    process.env.NODE_ENV = original.NODE_ENV;
    process.env.TEAM1_DEMO_STAFF_AUTH = original.FLAG;
  });

  it("allows the request only when NODE_ENV != production AND the flag is exactly 'enabled', with a staff header", () => {
    process.env.NODE_ENV = "development";
    process.env.TEAM1_DEMO_STAFF_AUTH = "enabled";
    const req = { headers: { [_internal.STAFF_ID_HEADER]: "staff-42" } };
    const res = mockRes();
    const next = vi.fn();
    team1StaffAuthorizationAdapter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ uid: "staff-42", authMethod: "TEAM1_DEMO_STAFF_ADAPTER" });
  });

  it("blocks in production even with the flag enabled and a valid header", () => {
    process.env.NODE_ENV = "production";
    process.env.TEAM1_DEMO_STAFF_AUTH = "enabled";
    const req = { headers: { [_internal.STAFF_ID_HEADER]: "staff-42" } };
    const res = mockRes();
    const next = vi.fn();
    team1StaffAuthorizationAdapter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("blocks when the flag is not exactly 'enabled' (e.g. unset, empty, or truthy-but-wrong)", () => {
    process.env.NODE_ENV = "development";
    for (const flagValue of [undefined, "", "true", "1", "yes"]) {
      if (flagValue === undefined) delete process.env.TEAM1_DEMO_STAFF_AUTH;
      else process.env.TEAM1_DEMO_STAFF_AUTH = flagValue;
      const req = { headers: { [_internal.STAFF_ID_HEADER]: "staff-42" } };
      const res = mockRes();
      const next = vi.fn();
      team1StaffAuthorizationAdapter(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
  });

  it("blocks a missing or blank staff header even when demo mode is enabled", () => {
    process.env.NODE_ENV = "development";
    process.env.TEAM1_DEMO_STAFF_AUTH = "enabled";
    for (const headers of [{}, { [_internal.STAFF_ID_HEADER]: "" }, { [_internal.STAFF_ID_HEADER]: "   " }]) {
      const req = { headers };
      const res = mockRes();
      const next = vi.fn();
      team1StaffAuthorizationAdapter(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    }
  });

  it("never grants access based on request body content, only the configured header", () => {
    process.env.NODE_ENV = "development";
    process.env.TEAM1_DEMO_STAFF_AUTH = "enabled";
    const req = { headers: {}, body: { role: "admin", staffId: "someone", isStaff: true } };
    const res = mockRes();
    const next = vi.fn();
    team1StaffAuthorizationAdapter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

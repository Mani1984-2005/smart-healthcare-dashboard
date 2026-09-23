import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "../authStore.js";

describe("auth session identity flow", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it("restores the canonical patient identity from a persisted session", () => {
    const persistedUser = {
      id: "42",
      patientId: 42,
      name: "Aisha Khan",
      email: "aisha@example.com",
      role: "PATIENT",
      hospitalId: "hospital-01",
      token: "test-token-PATIENT-42",
    };

    localStorage.setItem("medicare_pro_user", JSON.stringify(persistedUser));
    localStorage.setItem("medicare_auth_token", persistedUser.token);

    const restored = useAuthStore.getState();

    expect(restored.user?.id).toBe("42");
    expect(restored.user?.patientId).toBe(42);
    expect(restored.isAuthenticated).toBe(true);
  });

  it("clears patient-scoped caches when the user logs out", () => {
    useAuthStore.getState().login({
      id: "42",
      patientId: 42,
      name: "Aisha Khan",
      email: "aisha@example.com",
      role: "PATIENT",
      hospitalId: "hospital-01",
      token: "test-token-PATIENT-42",
    });

    localStorage.setItem("medicare_selected_patient", JSON.stringify({ id: "42" }));
    localStorage.setItem("medicare_selected_appointment", JSON.stringify({ id: "apt-801" }));
    localStorage.setItem("medicare_selected_encounter", JSON.stringify({ id: "enc-801" }));

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem("medicare_pro_user")).toBeNull();
    expect(localStorage.getItem("medicare_auth_token")).toBeNull();
    expect(localStorage.getItem("medicare_selected_patient")).toBeNull();
    expect(localStorage.getItem("medicare_selected_appointment")).toBeNull();
    expect(localStorage.getItem("medicare_selected_encounter")).toBeNull();
  });
});

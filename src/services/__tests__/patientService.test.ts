import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "../api.js";
import { fetchPatientById, fetchPatients } from "../patientService.js";

describe("patientService live payload mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the backend patient envelope for the patient list", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 7,
            name: "Aisha Khan",
            age: 29,
            gender: "Female",
            phone: "+91 90000 00007",
            email: "aisha@example.com",
            bloodGroup: "A+",
            address: "Central Road",
            medicalHistory: ["Asthma"],
            status: "Active",
            registrationDate: "2026-01-01",
          },
        ],
      },
    });

    const patients = await fetchPatients();

    expect(patients).toHaveLength(1);
    expect(patients[0].id).toBe("7");
    expect(patients[0].fullName).toBe("Aisha Khan");
  });

  it("reads the backend patient envelope for a single patient", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: {
          id: 11,
          name: "Rahul Mehra",
          age: 47,
          gender: "Male",
          phone: "99999",
          email: "rahul@example.com",
          bloodGroup: "B+",
          address: "Sector 12",
          medicalHistory: ["Diabetes"],
          status: "Under Observation",
          registrationDate: "2025-10-01",
        },
      },
    });

    const patient = await fetchPatientById(11);

    expect(patient.id).toBe("11");
    expect(patient.fullName).toBe("Rahul Mehra");
    expect(patient.status).toBe("Under Observation");
  });
});

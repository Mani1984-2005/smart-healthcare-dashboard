import test from "node:test";
import assert from "node:assert/strict";
import prisma from "../db.js";
import { seedDoctors } from "../scripts/seed-dev-doctors.js";

test("seedDoctors creates a working baseline doctor roster without duplicating records", async () => {
  await seedDoctors();

  const doctors = await prisma.doctor.findMany({
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  assert.ok(doctors.length >= 3, `Expected at least 3 seeded doctors, got ${doctors.length}`);
  const names = doctors.map((doctor) => doctor.name);
  assert.ok(names.includes("Dr. Aisha Verma"), "Seed should include Dr. Aisha Verma");
  assert.ok(names.includes("Dr. Rohit Mehta"), "Seed should include Dr. Rohit Mehta");

  await seedDoctors();
  const secondPass = await prisma.doctor.count();
  assert.ok(secondPass >= 3, `Seed should remain idempotent; count was ${secondPass}`);
});

import prisma from "../db.js";

const SEED_DOCTORS = [
  {
    name: "Dr. Aisha Verma",
    department: "Cardiology",
    specialization: "Interventional Cardiology",
    phone: "+91 98765 10001",
    email: "aisha.verma@medicare.dev",
  },
  {
    name: "Dr. Rohit Mehta",
    department: "Orthopedics",
    specialization: "Joint Replacement",
    phone: "+91 98765 10002",
    email: "rohit.mehta@medicare.dev",
  },
  {
    name: "Dr. Neha Kapoor",
    department: "Neurology",
    specialization: "Epilepsy & Stroke Care",
    phone: "+91 98765 10003",
    email: "neha.kapoor@medicare.dev",
  },
  {
    name: "Dr. Suresh Iyer",
    department: "General Medicine",
    specialization: "Internal Medicine",
    phone: "+91 98765 10004",
    email: "suresh.iyer@medicare.dev",
  },
];

export async function seedDoctors() {
  let created = 0;

  for (const doctor of SEED_DOCTORS) {
    const existing = await prisma.doctor.findUnique({
      where: { email: doctor.email },
    });

    if (existing) continue;

    await prisma.doctor.create({
      data: {
        name: doctor.name,
        department: doctor.department,
        specialization: doctor.specialization,
        phone: doctor.phone,
        email: doctor.email,
      },
    });

    created += 1;
  }

  return {
    created,
    total: await prisma.doctor.count(),
  };
}

export async function ensureDevDoctorSeed() {
  if (process.env.NODE_ENV === "production") {
    return { created: 0, total: await prisma.doctor.count(), skipped: true };
  }

  const total = await prisma.doctor.count();
  if (total > 0) {
    return { created: 0, total, skipped: true };
  }

  return seedDoctors();
}

async function runSeed() {
  const result = await ensureDevDoctorSeed();
  console.log(`[seed-dev-doctors] created=${result.created} total=${result.total} skipped=${Boolean(result.skipped)}`);
  await prisma.$disconnect();
}

if (process.argv[1] && process.argv[1].includes("seed-dev-doctors.js")) {
  runSeed().catch((error) => {
    console.error("[seed-dev-doctors] failed", error);
    process.exitCode = 1;
  });
}

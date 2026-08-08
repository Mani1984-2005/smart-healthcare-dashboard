import fetch from "node-fetch";

async function verify() {
  const endpoints = [
    "/api/v1/health",
    "/api/v1/patients",
    "/api/v1/doctors",
    "/api/v1/appointments",
    "/api/v1/queue",
    "/api/v1/pharmacy/medicines",
    "/api/v1/laboratory/tests",
    "/api/v1/billing/invoices",
    "/api/v1/hospital/departments",
  ];

  const results = [];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5000${ep}`);
      results.push({ ep, status: res.status });
    } catch (err) {
      results.push({ ep, status: "ERROR" });
    }
  }

  console.table(results);
}

verify();

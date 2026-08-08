import fetch from 'node-fetch';
import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api/v1';
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer test-token-ADMIN'
};

async function run() {
  console.log("Starting E2E API Integration Tests...");
  let patientId, doctorId;

  // 1. Create Patient
  console.log("\\n1. Creating Patient...");
  const patientRes = await fetch(`${BASE_URL}/patients`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      name: "John Doe",
      age: 30,
      email: "john.doe." + Date.now() + "@example.com",
      phone: "555-1234-567",
      gender: "Male",
      address: "123 Main St"
    })
  });
  const patientData = await patientRes.json();
  assert.ok([200, 201].includes(patientRes.status), `Expected 200/201, got ${patientRes.status}. Body: ${JSON.stringify(patientData)}`);
  assert.ok(patientData.id, "Patient ID should exist");
  patientId = patientData.id;
  console.log("✅ Patient created successfully:", patientId);

  // 2. Create Doctor
  console.log("\\n2. Creating Doctor...");
  const doctorRes = await fetch(`${BASE_URL}/doctors`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      name: "Dr. Alice Smith",
      department: "Cardiology",
      specialization: "Heart Surgeon",
      email: "alice.smith." + Date.now() + "@hospital.com",
      phone: "555-4321-000"
    })
  });
  const doctorData = await doctorRes.json();
  assert.ok([200, 201].includes(doctorRes.status), `Expected 200/201, got ${doctorRes.status}. Body: ${JSON.stringify(doctorData)}`);
  assert.ok(doctorData.id, "Doctor ID should exist");
  doctorId = doctorData.id;
  console.log("✅ Doctor created successfully:", doctorId);

  // 3. Create Appointment
  console.log("\\n3. Creating Appointment...");
  const aptRes = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      patientId: patientId,
      doctorId: doctorId,
      date: new Date().toISOString(),
      timeSlot: "10:00 AM",
      status: "SCHEDULED",
      notes: "Routine checkup"
    })
  });
  const aptData = await aptRes.json();
  assert.ok([200, 201].includes(aptRes.status), `Expected 200/201, got ${aptRes.status}. Body: ${JSON.stringify(aptData)}`);
  assert.ok(aptData.id, "Appointment ID should exist");
  console.log("✅ Appointment created successfully:", aptData.id);

  console.log("\\n🎉 All E2E Integration Tests Passed Successfully!");
}

run().catch(err => {
  console.error("\\n❌ Test failed:", err.message);
  process.exit(1);
});

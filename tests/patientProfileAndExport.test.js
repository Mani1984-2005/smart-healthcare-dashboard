// tests/patientProfileAndExport.test.js
// Focused regression test for Patient Profile calculations, resilience with sparse data, and PDF export

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAge,
  ageDisplay,
  getRiskLevel,
  getClinicalAlerts,
  getOutstandingBalance,
  getVisitCount,
  visitCountLabel,
  statusColor,
  buildQRPayload,
} from '../src/utils/patientHelpers.js';
import { generatePatientPDF, generatePatientSummary } from '../src/utils/patientPDF.js';

describe('Patient Profile Helpers & Resilience Suite', () => {
  test('calculateAge handles DOB string, patient object, and legacy age fallback', () => {
    // 1. DOB string
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 30;
    const ageFromDob = calculateAge(`${birthYear}-01-15`);
    assert.ok(ageFromDob === 30 || ageFromDob === 29);

    // 2. Patient object with DOB
    const patientWithDob = { dob: `${birthYear}-01-15`, age: '45' };
    const ageFromPatient = calculateAge(patientWithDob);
    assert.ok(ageFromPatient === 30 || ageFromPatient === 29);

    // 3. Fallback age
    const legacyPatient = { dob: '', age: '52' };
    assert.equal(calculateAge(legacyPatient), 52);
    assert.equal(calculateAge('', '40'), 40);

    // 4. Missing / invalid
    assert.equal(calculateAge(null), null);
    assert.equal(calculateAge({}), null);
    assert.equal(calculateAge('invalid-date', 'not-a-number'), null);
  });

  test('ageDisplay formats readable string or fallback gracefully', () => {
    assert.equal(ageDisplay(null), 'Not Recorded');
    assert.equal(ageDisplay({}), 'Not Recorded');

    const legacy = { dob: '', age: '35' };
    assert.equal(ageDisplay(legacy), '35 yrs');

    const currentYear = new Date().getFullYear();
    const dobString = `${currentYear - 25}-06-15`;
    const formatted = ageDisplay(dobString);
    assert.ok(formatted.includes('25 yrs (DOB:'));
  });

  test('getRiskLevel correctly identifies Critical, High, Medium, and Low risk', () => {
    assert.equal(getRiskLevel({ status: 'Critical' }), 'Critical');
    assert.equal(getRiskLevel({ priority: 'Emergency' }), 'Critical');
    assert.equal(getRiskLevel({ chronicDiseases: 'Cancer stage 2' }), 'Critical');

    assert.equal(getRiskLevel({ chronicDiseases: 'Type 2 Diabetes' }), 'High');
    assert.equal(getRiskLevel({ priority: 'High' }), 'High');
    assert.equal(getRiskLevel({ allergies: 'penicillin' }), 'High');

    assert.equal(getRiskLevel({ priority: 'Moderate' }), 'Medium');
    assert.equal(getRiskLevel({ allergies: 'dust' }), 'Medium');

    assert.equal(getRiskLevel({ status: 'Active', priority: 'Normal' }), 'Low');
    assert.equal(getRiskLevel(null), 'Low');
    assert.equal(getRiskLevel({}), 'Low');
  });

  test('getClinicalAlerts flags conditions without throwing on missing fields', () => {
    assert.deepEqual(getClinicalAlerts(null), []);
    assert.deepEqual(getClinicalAlerts({}), []);

    const alerts = getClinicalAlerts({
      disease: 'Diabetes Mellitus and Hypertension',
      allergies: 'Penicillin',
      pregnancyStatus: 'Pregnant',
      status: 'Critical',
    });

    const labels = alerts.map((a) => a.label);
    assert.ok(labels.includes('Diabetic'));
    assert.ok(labels.includes('Hypertension'));
    assert.ok(labels.includes('Drug Allergy'));
    assert.ok(labels.includes('Pregnancy'));
    assert.ok(labels.includes('Critical'));
  });

  test('getVisitCount counts consultation events safely', () => {
    assert.equal(getVisitCount(null), 0);
    assert.equal(getVisitCount([]), 0);

    const timeline = [
      { id: 1, type: 'Registration' },
      { id: 2, type: 'Consultation' },
      { id: 3, type: 'Lab Test' },
      { id: 4, type: 'Consultation' },
    ];
    assert.equal(getVisitCount(timeline), 2);
    assert.equal(visitCountLabel(2), 'Visit #2');
    assert.equal(visitCountLabel(0), 'No visits');
  });

  test('buildQRPayload generates structured text', () => {
    const p = { id: 'PAT-101', name: 'John Doe', bloodGroup: 'O+', phone: '9988776655' };
    const payload = buildQRPayload(p);
    assert.ok(payload.includes('PAT-101'));
    assert.ok(payload.includes('John Doe'));
  });
});

describe('Patient PDF Export Functionality', () => {
  test('generatePatientPDF completes successfully for complete patient record', () => {
    const fullPatient = {
      id: 'PAT-1002',
      name: 'Sneha Patel',
      age: '28',
      dob: '1998-05-12',
      gender: 'Female',
      bloodGroup: 'A+',
      phone: '9876543211',
      email: 'sneha@example.com',
      disease: 'Diabetes',
      address: 'Bangalore, Karnataka',
      emergencyContact: {
        name: 'Rajesh Patel',
        phone: '9876543212',
        relation: 'Spouse',
      },
      allergies: 'Penicillin',
      height: 165,
      weight: 60,
      bmi: '22.0',
      timeline: [
        { id: 1, type: 'Registration', title: 'Initial registration', date: '2026-06-10' },
        { id: 2, type: 'Consultation', title: 'Routine consultation', date: '2026-06-15' },
      ],
    };

    assert.doesNotThrow(() => {
      generatePatientPDF(fullPatient);
    });
  });

  test('generatePatientPDF handles sparse record with string emergencyContact and missing vitals', () => {
    const sparsePatient = {
      id: 'PAT-9999',
      name: 'Sparse Record',
      gender: 'Male',
      emergencyContact: '9876543210',
    };

    assert.doesNotThrow(() => {
      generatePatientPDF(sparsePatient);
    });
  });

  test('generatePatientSummary generates multi-patient report table', () => {
    const patientList = [
      { id: 'PAT-1', name: 'Alice', age: 30, gender: 'Female', bloodGroup: 'O+', status: 'Active' },
      { id: 'PAT-2', name: 'Bob', age: 40, gender: 'Male', bloodGroup: 'A+', status: 'Discharged' },
    ];

    assert.doesNotThrow(() => {
      generatePatientSummary(patientList);
    });
  });
});

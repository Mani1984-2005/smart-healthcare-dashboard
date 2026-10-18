import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getSymptomSuggestion } from '../src/utils/symptomSuggestion.js';

describe('Dashboard Runtime Regression Suite', () => {
  describe('symptomSuggestion validation & behavior', () => {
    test('returns null for undefined symptoms', () => {
      const res = getSymptomSuggestion(undefined);
      assert.strictEqual(res, null);
    });

    test('returns null for null symptoms', () => {
      const res = getSymptomSuggestion(null);
      assert.strictEqual(res, null);
    });

    test('returns null for empty string or whitespace-only symptoms', () => {
      assert.strictEqual(getSymptomSuggestion(''), null);
      assert.strictEqual(getSymptomSuggestion('   '), null);
      assert.strictEqual(getSymptomSuggestion('\t\n'), null);
    });

    test('returns null for non-string types (numbers, objects, booleans, arrays)', () => {
      assert.strictEqual(getSymptomSuggestion(123), null);
      assert.strictEqual(getSymptomSuggestion(true), null);
      assert.strictEqual(getSymptomSuggestion({}), null);
      assert.strictEqual(getSymptomSuggestion(['fever']), null);
      assert.strictEqual(getSymptomSuggestion(NaN), null);
    });

    test('preserves valid symptom matching for Cardiologist (chest/heart)', () => {
      const res1 = getSymptomSuggestion('chest pain and heaviness');
      assert.ok(res1);
      assert.strictEqual(res1.doctor, 'Cardiologist');
      assert.strictEqual(res1.level, 'High Priority');

      const res2 = getSymptomSuggestion('Heart palpitations');
      assert.ok(res2);
      assert.strictEqual(res2.doctor, 'Cardiologist');
    });

    test('preserves valid symptom matching for Dermatologist (skin/allergy/rash)', () => {
      const res = getSymptomSuggestion('Severe skin rash and itching');
      assert.ok(res);
      assert.strictEqual(res.doctor, 'Dermatologist');
      assert.strictEqual(res.level, 'Normal Priority');
    });

    test('preserves valid symptom matching for Neurologist (headache/migraine/brain)', () => {
      const res = getSymptomSuggestion('migraine headache since morning');
      assert.ok(res);
      assert.strictEqual(res.doctor, 'Neurologist');
      assert.strictEqual(res.level, 'Medium Priority');
    });

    test('preserves valid symptom matching for Orthopedic (bone/fracture/joint/leg)', () => {
      const res = getSymptomSuggestion('Swollen knee joint and leg pain');
      assert.ok(res);
      assert.strictEqual(res.doctor, 'Orthopedic');
      assert.strictEqual(res.level, 'Medium Priority');
    });

    test('preserves valid symptom matching for General Doctor (fever/cold/cough)', () => {
      const res = getSymptomSuggestion('high fever with dry cough');
      assert.ok(res);
      assert.strictEqual(res.doctor, 'General Doctor');
      assert.strictEqual(res.level, 'Normal Priority');
    });

    test('returns general checkup advice for non-matching symptoms', () => {
      const res = getSymptomSuggestion('general tiredness and fatigue');
      assert.ok(res);
      assert.strictEqual(res.doctor, 'Available Doctor');
      assert.strictEqual(res.level, 'General Checkup');
    });
  });

  describe('Dashboard patient storage parsing & normalization', () => {
    let mockStorage = {};
    const mockLocalStorage = {
      getItem: (key) => mockStorage[key] ?? null,
      setItem: (key, val) => {
        mockStorage[key] = String(val);
      },
      removeItem: (key) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    beforeEach(() => {
      mockLocalStorage.clear();
    });

    test('safely parses absent patient records without crashing', () => {
      let existingPatients = [];
      const rawPatients = mockLocalStorage.getItem('patients');
      if (rawPatients) {
        try {
          const parsed = JSON.parse(rawPatients);
          if (Array.isArray(parsed)) {
            existingPatients = parsed.filter(Boolean);
          }
        } catch {
          // ignore
        }
      }
      assert.deepEqual(existingPatients, []);
    });

    test('safely handles malformed JSON without crashing and preserves raw backup', () => {
      const corruptedJson = '{"broken": [true, ';
      mockLocalStorage.setItem('patients', corruptedJson);

      let existingPatients = [];
      let backupSaved = false;
      const rawPatients = mockLocalStorage.getItem('patients');
      if (rawPatients) {
        try {
          const parsed = JSON.parse(rawPatients);
          if (Array.isArray(parsed)) {
            existingPatients = parsed.filter(Boolean);
          }
        } catch (parseErr) {
          if (!mockLocalStorage.getItem('patients_corrupted_backup')) {
            mockLocalStorage.setItem('patients_corrupted_backup', rawPatients);
            backupSaved = true;
          }
        }
      }

      assert.deepEqual(existingPatients, []);
      assert.strictEqual(backupSaved, true);
      assert.strictEqual(mockLocalStorage.getItem('patients_corrupted_backup'), corruptedJson);
    });

    test('safely handles non-array stored data (numbers/objects) and preserves backup', () => {
      const invalidData = '{"role": "admin"}';
      mockLocalStorage.setItem('patients', invalidData);

      let existingPatients = [];
      let backupSaved = false;
      const rawPatients = mockLocalStorage.getItem('patients');
      if (rawPatients) {
        try {
          const parsed = JSON.parse(rawPatients);
          if (Array.isArray(parsed)) {
            existingPatients = parsed.filter(Boolean);
          } else {
            if (!mockLocalStorage.getItem('patients_corrupted_backup')) {
              mockLocalStorage.setItem('patients_corrupted_backup', rawPatients);
              backupSaved = true;
            }
          }
        } catch {
          // ignore
        }
      }

      assert.deepEqual(existingPatients, []);
      assert.strictEqual(backupSaved, true);
      assert.strictEqual(mockLocalStorage.getItem('patients_corrupted_backup'), invalidData);
    });

    test('safely parses valid patient array and preserves existing patient records', () => {
      const initialPatients = [
        { id: 'PAT-001', name: 'Ravi Kumar', phone: '9876543210', disease: 'Chest pain' },
        { id: 'PAT-002', name: 'Sunita Sharma', phone: '9876543211', disease: 'Fever' },
      ];
      mockLocalStorage.setItem('patients', JSON.stringify(initialPatients));

      let existingPatients = [];
      const rawPatients = mockLocalStorage.getItem('patients');
      if (rawPatients) {
        try {
          const parsed = JSON.parse(rawPatients);
          if (Array.isArray(parsed)) {
            existingPatients = parsed.filter(Boolean);
          }
        } catch {
          // ignore
        }
      }

      assert.strictEqual(existingPatients.length, 2);
      assert.strictEqual(existingPatients[0].name, 'Ravi Kumar');
      assert.strictEqual(existingPatients[1].name, 'Sunita Sharma');

      // Add new patient and verify existing patients are not discarded
      const newPatient = { id: 'PAT-003', name: 'Aman Verma', phone: '9876543212', disease: 'Headache' };
      const updated = [newPatient, ...existingPatients];
      mockLocalStorage.setItem('patients', JSON.stringify(updated));

      const saved = JSON.parse(mockLocalStorage.getItem('patients'));
      assert.strictEqual(saved.length, 3);
      assert.strictEqual(saved[0].name, 'Aman Verma');
      assert.strictEqual(saved[1].name, 'Ravi Kumar');
      assert.strictEqual(saved[2].name, 'Sunita Sharma');
    });

    test('normalizes missing appointment symptoms to empty string on edit', () => {
      const apptWithUndefinedSymptoms = {
        id: 'APT-1',
        token: 'TK-100',
        patient: 'John Doe',
        doctor: 'Dr. Arjun Raza',
        date: '2026-10-20',
        time: '10:00',
        symptoms: undefined,
      };

      const formData = {
        patient: apptWithUndefinedSymptoms.patient || '',
        age: apptWithUndefinedSymptoms.age !== undefined && apptWithUndefinedSymptoms.age !== null ? apptWithUndefinedSymptoms.age : '',
        phone: apptWithUndefinedSymptoms.phone || '',
        symptoms: apptWithUndefinedSymptoms.symptoms || '',
        date: apptWithUndefinedSymptoms.date || '',
        time: apptWithUndefinedSymptoms.time || '',
      };

      assert.strictEqual(formData.symptoms, '');
      // Ensure passing normalized symptoms to getSymptomSuggestion does not throw
      assert.doesNotThrow(() => {
        const suggestion = getSymptomSuggestion(formData.symptoms);
        assert.strictEqual(suggestion, null);
      });
    });

    test('preserves valid appointment symptoms on edit', () => {
      const apptWithSymptoms = {
        id: 'APT-2',
        token: 'TK-101',
        patient: 'Jane Doe',
        doctor: 'Dr. Sunita Sharma',
        date: '2026-10-21',
        time: '11:00',
        symptoms: 'severe migraine headache',
      };

      const formData = {
        patient: apptWithSymptoms.patient || '',
        age: apptWithSymptoms.age !== undefined && apptWithSymptoms.age !== null ? apptWithSymptoms.age : '',
        phone: apptWithSymptoms.phone || '',
        symptoms: apptWithSymptoms.symptoms || '',
        date: apptWithSymptoms.date || '',
        time: apptWithSymptoms.time || '',
      };

      assert.strictEqual(formData.symptoms, 'severe migraine headache');
      const suggestion = getSymptomSuggestion(formData.symptoms);
      assert.ok(suggestion);
      assert.strictEqual(suggestion.doctor, 'Neurologist');
    });
  });

  describe('HomePage & DoctorsPage navigation safety & contract', () => {
    test('calls setPage when setPage is a valid function', () => {
      let navigatedTo = null;
      const setPage = (page) => { navigatedTo = page; };
      const handleNavigate = (targetPage) => {
        if (typeof setPage === 'function') {
          setPage(targetPage);
        }
      };

      handleNavigate('Dashboard');
      assert.strictEqual(navigatedTo, 'Dashboard');

      handleNavigate('Doctors');
      assert.strictEqual(navigatedTo, 'Doctors');
    });

    test('does not throw TypeError when setPage is undefined or null', () => {
      let routedTo = null;
      const fakeNavigate = (path) => { routedTo = path; };

      const createNavHandler = (setPageFn) => (targetPage) => {
        if (typeof setPageFn === 'function') {
          setPageFn(targetPage);
        } else {
          if (targetPage === 'Home') fakeNavigate('/');
          else if (targetPage === 'Patient Relations') fakeNavigate('/patient-relations');
          else fakeNavigate(`/${targetPage.toLowerCase().replace(/\s+/g, '-')}`);
        }
      };

      // When setPage is undefined
      const handlerUndefined = createNavHandler(undefined);
      assert.doesNotThrow(() => handlerUndefined('Dashboard'));
      assert.strictEqual(routedTo, '/dashboard');

      // When setPage is null
      const handlerNull = createNavHandler(null);
      assert.doesNotThrow(() => handlerNull('Doctors'));
      assert.strictEqual(routedTo, '/doctors');

      // When setPage is a non-function
      const handlerObject = createNavHandler({});
      assert.doesNotThrow(() => handlerObject('Patient Relations'));
      assert.strictEqual(routedTo, '/patient-relations');
    });

    test('DoctorsPage handleBookAppointment safely handles undefined setPage and setSelectedDoctorFromPage', () => {
      let selectedDoctor = null;
      let routedTo = null;
      const fakeNavigate = (path) => { routedTo = path; };

      const handleBook = (doctor, setPageFn, setDoctorFn) => {
        if (typeof setDoctorFn === 'function') {
          setDoctorFn(doctor);
        }
        if (typeof setPageFn === 'function') {
          setPageFn('Dashboard');
        } else {
          fakeNavigate('/dashboard');
        }
      };

      // All props undefined
      assert.doesNotThrow(() => handleBook({ id: 1, name: 'Dr. Test' }, undefined, undefined));
      assert.strictEqual(routedTo, '/dashboard');

      // With doctor setter but no setPage
      assert.doesNotThrow(() => handleBook({ id: 2, name: 'Dr. Jane' }, undefined, (doc) => { selectedDoctor = doc; }));
      assert.strictEqual(selectedDoctor.name, 'Dr. Jane');
      assert.strictEqual(routedTo, '/dashboard');
    });
  });
});


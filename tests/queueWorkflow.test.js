// tests/queueWorkflow.test.js
// Focused Phase 2 Queue Security, Concurrency, and Workflow Regression Test Suite
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Import service logic to be tested against mocked Prisma delegate
import {
  checkInPatient,
  updateQueueStatus,
  listQueueItems,
  getQueueItemById,
  ALLOWED_QUEUE_STATUSES,
  VALID_QUEUE_TRANSITIONS,
} from '../backend/services/queueService.js';

describe('Phase 2 Queue Security & Workflow Service Suite', () => {
  let mockAppointments = {};
  let mockQueues = {};
  const txCalls = [];

  // Mock Prisma client with transactional support
  const createMockPrisma = () => {
    return {
      appointment: {
        findUnique: async ({ where }) => mockAppointments[where.id] || null,
        update: async ({ where, data }) => {
          if (!mockAppointments[where.id]) throw new Error('Appointment not found');
          mockAppointments[where.id] = { ...mockAppointments[where.id], ...data };
          return mockAppointments[where.id];
        },
      },
      queue: {
        findFirst: async ({ where }) => {
          return Object.values(mockQueues).find((q) => {
            if (where.appointmentId && q.appointmentId !== where.appointmentId) return false;
            if (where.status?.notIn && where.status.notIn.includes(q.status)) return false;
            return true;
          }) || null;
        },
        findUnique: async ({ where }) => mockQueues[where.id] || null,
        findMany: async ({ where = {} }) => {
          return Object.values(mockQueues).filter((q) => {
            if (where.patientId && q.patientId !== where.patientId) return false;
            if (where.status && q.status !== where.status) return false;
            return true;
          });
        },
        create: async ({ data, include }) => {
          const id = `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const created = {
            id,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: mockAppointments[data.appointmentId]?.patient || { id: data.patientId, name: 'Test Patient' },
            appointment: mockAppointments[data.appointmentId] || { id: data.appointmentId },
          };
          mockQueues[id] = created;
          return created;
        },
        update: async ({ where, data }) => {
          if (!mockQueues[where.id]) throw new Error('Queue item not found');
          mockQueues[where.id] = { ...mockQueues[where.id], ...data, updatedAt: new Date() };
          return mockQueues[where.id];
        },
      },
      $transaction: async (fn) => {
        txCalls.push('transaction-started');
        return await fn(createMockPrisma());
      },
    };
  };

  beforeEach(() => {
    mockAppointments = {
      'apt-101': {
        id: 'apt-101',
        patientId: 1,
        doctorId: 'doc-alpha',
        status: 'SCHEDULED',
        date: new Date('2026-10-10T10:00:00Z'),
        timeSlot: '10:00-10:30',
        patient: { id: 1, name: 'Alice Smith' },
        doctor: { id: 'doc-alpha', name: 'Dr. Alpha' },
      },
      'apt-102': {
        id: 'apt-102',
        patientId: 2,
        doctorId: 'doc-beta',
        status: 'SCHEDULED',
        date: new Date('2026-10-10T11:00:00Z'),
        timeSlot: '11:00-11:30',
        patient: { id: 2, name: 'Bob Jones' },
        doctor: { id: 'doc-beta', name: 'Dr. Beta' },
      },
      'apt-cancelled': {
        id: 'apt-cancelled',
        patientId: 1,
        doctorId: 'doc-alpha',
        status: 'CANCELLED',
        patient: { id: 1, name: 'Alice Smith' },
      },
      'apt-completed': {
        id: 'apt-completed',
        patientId: 1,
        doctorId: 'doc-alpha',
        status: 'COMPLETED',
        patient: { id: 1, name: 'Alice Smith' },
      },
    };
    mockQueues = {};
  });

  // 1. Patient check-in ownership enforcement
  test('Patient cannot check in for another patient\'s appointment (Ownership Violation)', async () => {
    const prisma = createMockPrisma();
    const user = { role: 'PATIENT', patientId: 1 }; // Alice

    await assert.rejects(
      async () => {
        // Attempting to check in Bob's appointment
        await checkInPatient({
          user,
          appointmentId: 'apt-102',
          patientId: 2,
          doctorId: 'doc-beta',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /Forbidden.*cannot check in for another patient/i);
        return true;
      }
    );
  });

  // 2. Patient checking in for own eligible appointment
  test('Patient can check in for their own eligible SCHEDULED appointment', async () => {
    const prisma = createMockPrisma();
    const user = { role: 'PATIENT', patientId: 1 }; // Alice

    const result = await checkInPatient({
      user,
      appointmentId: 'apt-101',
      doctorId: 'doc-alpha',
      prisma,
    });

    assert.equal(result.patientId, 1);
    assert.equal(result.appointmentId, 'apt-101');
    assert.equal(result.status, 'WAITING');
    assert.equal(mockAppointments['apt-101'].status, 'ARRIVED', 'Appointment status must be updated to ARRIVED');
    assert.ok(txCalls.length > 0, 'Atomic transaction must be executed');
  });

  // 3. Staff proxy check-in
  test('Staff (RECEPTIONIST/ADMIN) can check in appointment on behalf of patient', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'RECEPTIONIST', id: 'rec-1' };

    const result = await checkInPatient({
      user: staffUser,
      appointmentId: 'apt-102',
      prisma,
    });

    assert.equal(result.patientId, 2);
    assert.equal(result.status, 'WAITING');
    assert.equal(mockAppointments['apt-102'].status, 'ARRIVED');
  });

  // 4. Missing appointment
  test('Check-in rejects non-existent appointmentId with 404', async () => {
    const prisma = createMockPrisma();
    const user = { role: 'PATIENT', patientId: 1 };

    await assert.rejects(
      async () => {
        await checkInPatient({
          user,
          appointmentId: 'apt-does-not-exist',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.match(err.message, /Appointment not found/i);
        return true;
      }
    );
  });

  // 5. Ineligible appointment statuses (CANCELLED or COMPLETED)
  test('Check-in rejects CANCELLED or COMPLETED appointment with 409 Conflict', async () => {
    const prisma = createMockPrisma();
    const user = { role: 'PATIENT', patientId: 1 };

    await assert.rejects(
      async () => {
        await checkInPatient({
          user,
          appointmentId: 'apt-cancelled',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /not eligible for check-in/i);
        return true;
      }
    );
  });

  // 6. Doctor consistency
  test('Check-in rejects doctor mismatch with 400 Bad Request', async () => {
    const prisma = createMockPrisma();
    const user = { role: 'PATIENT', patientId: 1 };

    await assert.rejects(
      async () => {
        await checkInPatient({
          user,
          appointmentId: 'apt-101',
          doctorId: 'wrong-doc',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Doctor does not match/i);
        return true;
      }
    );
  });

  // 7. Duplicate check-in prevention
  test('Duplicate check-in for already checked-in appointment returns 409 Conflict', async () => {
    const prisma = createMockPrisma();
    const user = { role: 'PATIENT', patientId: 1 };

    // First check-in
    await checkInPatient({
      user,
      appointmentId: 'apt-101',
      prisma,
    });

    // Attempt second check-in
    await assert.rejects(
      async () => {
        await checkInPatient({
          user,
          appointmentId: 'apt-101',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /already checked in|not eligible for check-in.*ARRIVED/i);
        return true;
      }
    );
  });

  // 8. Queue status allowlist and valid transitions
  test('Queue status update rejects invalid status strings with 400 Bad Request', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'DOCTOR', id: 'doc-1' };

    mockQueues['q-1'] = { id: 'q-1', status: 'WAITING', appointmentId: 'apt-101' };

    await assert.rejects(
      async () => {
        await updateQueueStatus({
          user: staffUser,
          queueId: 'q-1',
          newStatus: 'BOGUS_STATUS',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Invalid queue status/i);
        return true;
      }
    );
  });

  test('Valid status transition WAITING -> IN_PROGRESS updates queue and appointment status', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'DOCTOR', id: 'doc-alpha' };

    mockQueues['q-1'] = { id: 'q-1', status: 'WAITING', appointmentId: 'apt-101' };

    const updated = await updateQueueStatus({
      user: staffUser,
      queueId: 'q-1',
      newStatus: 'IN_PROGRESS',
      prisma,
    });

    assert.equal(updated.status, 'IN_PROGRESS');
    assert.equal(mockAppointments['apt-101'].status, 'IN_CONSULTATION');
  });

  test('Valid status transition IN_PROGRESS -> COMPLETED sets completedTime and completes appointment', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'DOCTOR', id: 'doc-alpha' };

    mockQueues['q-1'] = { id: 'q-1', status: 'IN_PROGRESS', appointmentId: 'apt-101' };

    const updated = await updateQueueStatus({
      user: staffUser,
      queueId: 'q-1',
      newStatus: 'COMPLETED',
      prisma,
    });

    assert.equal(updated.status, 'COMPLETED');
    assert.ok(updated.completedTime instanceof Date, 'completedTime must be recorded');
    assert.equal(mockAppointments['apt-101'].status, 'COMPLETED');
  });

  test('Illegal transition WAITING -> COMPLETED is rejected with 400 Bad Request', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'DOCTOR', id: 'doc-alpha' };

    mockQueues['q-1'] = { id: 'q-1', status: 'WAITING', appointmentId: 'apt-101' };

    await assert.rejects(
      async () => {
        await updateQueueStatus({
          user: staffUser,
          queueId: 'q-1',
          newStatus: 'COMPLETED',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Invalid status transition/i);
        return true;
      }
    );
  });

  // 9. Patient prohibited from updating queue status
  test('Patient role attempting to update queue status is rejected with 403 Forbidden', async () => {
    const prisma = createMockPrisma();
    const patientUser = { role: 'PATIENT', patientId: 1 };

    mockQueues['q-1'] = { id: 'q-1', status: 'WAITING', appointmentId: 'apt-101' };

    await assert.rejects(
      async () => {
        await updateQueueStatus({
          user: patientUser,
          queueId: 'q-1',
          newStatus: 'IN_PROGRESS',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /Forbidden.*staff.*queue status/i);
        return true;
      }
    );
  });

  // 10. Queue listing authorization and patient data scoping
  test('Patient listing queue only receives their own queue records', async () => {
    const prisma = createMockPrisma();
    const patientUser = { role: 'PATIENT', patientId: 1 };

    mockQueues['q-1'] = { id: 'q-1', patientId: 1, status: 'WAITING' };
    mockQueues['q-2'] = { id: 'q-2', patientId: 2, status: 'WAITING' };

    const items = await listQueueItems({ user: patientUser, prisma });
    assert.equal(items.length, 1);
    assert.equal(items[0].patientId, 1);
  });

  test('Staff listing queue receives all active queue records', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'RECEPTIONIST' };

    mockQueues['q-1'] = { id: 'q-1', patientId: 1, status: 'WAITING' };
    mockQueues['q-2'] = { id: 'q-2', patientId: 2, status: 'WAITING' };

    const items = await listQueueItems({ user: staffUser, prisma });
    assert.equal(items.length, 2);
  });
});

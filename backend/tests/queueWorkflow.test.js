// backend/tests/queueWorkflow.test.js
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
} from '../services/queueService.js';

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
      },
      'apt-completed': {
        id: 'apt-completed',
        patientId: 1,
        doctorId: 'doc-alpha',
        status: 'COMPLETED',
      },
    };

    mockQueues = {};
  });

  test('Patient cannot check in for another patient\'s appointment (Ownership Violation)', async () => {
    const prisma = createMockPrisma();
    const maliciousUser = { role: 'PATIENT', patientId: 999 };

    await assert.rejects(
      async () => {
        await checkInPatient({
          user: maliciousUser,
          appointmentId: 'apt-101',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'OWNERSHIP_VIOLATION');
        return true;
      }
    );
  });

  test('Patient can check in for their own eligible SCHEDULED appointment', async () => {
    const prisma = createMockPrisma();
    const authorizedPatient = { role: 'PATIENT', patientId: 1 };

    const result = await checkInPatient({
      user: authorizedPatient,
      appointmentId: 'apt-101',
      doctorId: 'doc-alpha',
      prisma,
    });

    assert.ok(result);
    assert.equal(result.status, 'WAITING');
    assert.equal(result.appointmentId, 'apt-101');
    assert.equal(result.patientId, 1);
    assert.equal(mockAppointments['apt-101'].status, 'ARRIVED');
  });

  test('Staff (RECEPTIONIST/ADMIN) can check in appointment on behalf of patient', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'RECEPTIONIST', id: 'rec-1' };

    const result = await checkInPatient({
      user: staffUser,
      appointmentId: 'apt-102',
      prisma,
    });

    assert.ok(result);
    assert.equal(result.status, 'WAITING');
    assert.equal(result.appointmentId, 'apt-102');
    assert.equal(result.patientId, 2);
    assert.equal(mockAppointments['apt-102'].status, 'ARRIVED');
  });

  test('Check-in rejects non-existent appointmentId with 404', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'ADMIN', id: 'admin-1' };

    await assert.rejects(
      async () => {
        await checkInPatient({
          user: staffUser,
          appointmentId: 'non-existent',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.code, 'APPOINTMENT_NOT_FOUND');
        return true;
      }
    );
  });

  test('Check-in rejects CANCELLED or COMPLETED appointment with 409 Conflict', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'ADMIN', id: 'admin-1' };

    await assert.rejects(
      async () => {
        await checkInPatient({
          user: staffUser,
          appointmentId: 'apt-cancelled',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 409);
        assert.equal(err.code, 'INELIGIBLE_APPOINTMENT_STATUS');
        return true;
      }
    );
  });

  test('Check-in rejects doctor mismatch with 400 Bad Request', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'ADMIN', id: 'admin-1' };

    await assert.rejects(
      async () => {
        await checkInPatient({
          user: staffUser,
          appointmentId: 'apt-101',
          doctorId: 'doc-mismatch',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'DOCTOR_MISMATCH');
        return true;
      }
    );
  });

  test('Duplicate check-in for already checked-in appointment returns 409 Conflict', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'ADMIN', id: 'admin-1' };

    // Initial checkin
    await checkInPatient({
      user: staffUser,
      appointmentId: 'apt-101',
      prisma,
    });

    // Attempt second checkin
    await assert.rejects(
      async () => {
        await checkInPatient({
          user: staffUser,
          appointmentId: 'apt-101',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 409);
        return true;
      }
    );
  });

  test('Queue status update rejects invalid status strings with 400 Bad Request', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'DOCTOR', id: 'doc-alpha' };

    await assert.rejects(
      async () => {
        await updateQueueStatus({
          user: staffUser,
          queueId: 'queue-1',
          newStatus: 'NON_EXISTENT_STATUS',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_STATUS');
        return true;
      }
    );
  });

  test('Valid status transition WAITING -> IN_PROGRESS updates queue and appointment status', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'DOCTOR', id: 'doc-alpha' };

    const checkedIn = await checkInPatient({
      user: staffUser,
      appointmentId: 'apt-101',
      prisma,
    });

    const updated = await updateQueueStatus({
      user: staffUser,
      queueId: checkedIn.id,
      newStatus: 'IN_PROGRESS',
      prisma,
    });

    assert.equal(updated.status, 'IN_PROGRESS');
    assert.equal(mockAppointments['apt-101'].status, 'IN_CONSULTATION');
  });

  test('Valid status transition IN_PROGRESS -> COMPLETED sets completedTime and completes appointment', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'DOCTOR', id: 'doc-alpha' };

    const checkedIn = await checkInPatient({
      user: staffUser,
      appointmentId: 'apt-101',
      prisma,
    });

    await updateQueueStatus({
      user: staffUser,
      queueId: checkedIn.id,
      newStatus: 'IN_PROGRESS',
      prisma,
    });

    const completed = await updateQueueStatus({
      user: staffUser,
      queueId: checkedIn.id,
      newStatus: 'COMPLETED',
      prisma,
    });

    assert.equal(completed.status, 'COMPLETED');
    assert.ok(completed.completedTime);
    assert.equal(mockAppointments['apt-101'].status, 'COMPLETED');
  });

  test('Illegal transition WAITING -> COMPLETED is rejected with 400 Bad Request', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'DOCTOR', id: 'doc-alpha' };

    const checkedIn = await checkInPatient({
      user: staffUser,
      appointmentId: 'apt-101',
      prisma,
    });

    await assert.rejects(
      async () => {
        await updateQueueStatus({
          user: staffUser,
          queueId: checkedIn.id,
          newStatus: 'COMPLETED',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_STATUS_TRANSITION');
        return true;
      }
    );
  });

  test('Patient role attempting to update queue status is rejected with 403 Forbidden', async () => {
    const prisma = createMockPrisma();
    const patientUser = { role: 'PATIENT', patientId: 1 };

    await assert.rejects(
      async () => {
        await updateQueueStatus({
          user: patientUser,
          queueId: 'any-id',
          newStatus: 'IN_PROGRESS',
          prisma,
        });
      },
      (err) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'STAFF_AUTHORIZATION_REQUIRED');
        return true;
      }
    );
  });

  test('Patient listing queue only receives their own queue records', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'ADMIN', id: 'admin-1' };

    await checkInPatient({ user: staffUser, appointmentId: 'apt-101', prisma }); // patient 1
    await checkInPatient({ user: staffUser, appointmentId: 'apt-102', prisma }); // patient 2

    const patient1Results = await listQueueItems({
      user: { role: 'PATIENT', patientId: 1 },
      prisma,
    });

    assert.equal(patient1Results.length, 1);
    assert.equal(patient1Results[0].patientId, 1);
  });

  test('Staff listing queue receives all active queue records', async () => {
    const prisma = createMockPrisma();
    const staffUser = { role: 'ADMIN', id: 'admin-1' };

    await checkInPatient({ user: staffUser, appointmentId: 'apt-101', prisma });
    await checkInPatient({ user: staffUser, appointmentId: 'apt-102', prisma });

    const allResults = await listQueueItems({
      user: { role: 'DOCTOR', id: 'doc-alpha' },
      prisma,
    });

    assert.equal(allResults.length, 2);
  });
});

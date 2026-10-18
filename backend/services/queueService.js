// backend/services/queueService.js
// Enterprise Queue Management Service — transactional integrity, ownership, and status transitions

export const ALLOWED_QUEUE_STATUSES = ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const VALID_QUEUE_TRANSITIONS = {
  WAITING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];

export class QueueError extends Error {
  constructor(message, status = 500, code = 'QUEUE_ERROR') {
    super(message);
    this.name = 'QueueError';
    this.status = status;
    this.code = code;
  }
}

function normalizeRole(role) {
  if (typeof role !== 'string') return '';
  return role.trim().toUpperCase();
}

async function getPrismaClient(explicitPrisma) {
  if (explicitPrisma) return explicitPrisma;
  try {
    const mod = await import('../db.js');
    return mod.default || mod;
  } catch (err) {
    throw new QueueError(
      'Database client is unavailable in this environment. Configure DATABASE_URL or provide Prisma client.',
      503,
      'DATABASE_UNAVAILABLE'
    );
  }
}

/**
 * Atomic Patient Check-In Workflow
 * Verifies appointment existence, patient ownership (for PATIENT role),
 * doctor alignment, eligible status (SCHEDULED), and absence of duplicates.
 * Atomically transitions appointment to ARRIVED and creates Queue item with status WAITING.
 */
export async function checkInPatient({
  user,
  appointmentId,
  patientId,
  doctorId,
  prisma,
}) {
  if (!appointmentId || typeof appointmentId !== 'string') {
    throw new QueueError('appointmentId is required and must be a string', 400, 'INVALID_INPUT');
  }

  const role = normalizeRole(user?.role);
  const userPatientId = user?.patientId !== undefined && user?.patientId !== null
    ? Number(user.patientId)
    : (role === 'PATIENT' && Number.isInteger(Number(user?.id)) ? Number(user.id) : null);

  const activePrisma = await getPrismaClient(prisma);

  return await activePrisma.$transaction(async (tx) => {
    // 1. Fetch appointment with relations
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appointment) {
      throw new QueueError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // 2. Ownership enforcement for PATIENT role
    if (role === 'PATIENT') {
      if (!userPatientId || appointment.patientId !== userPatientId) {
        throw new QueueError(
          "Forbidden: You cannot check in for another patient's appointment",
          403,
          'OWNERSHIP_VIOLATION'
        );
      }
    }

    // 3. Status eligibility: Only SCHEDULED appointments may be checked in
    if (appointment.status !== 'SCHEDULED') {
      throw new QueueError(
        `Appointment is not eligible for check-in (current status: ${appointment.status})`,
        409,
        'INELIGIBLE_APPOINTMENT_STATUS'
      );
    }

    // 4. Doctor consistency check
    if (doctorId && appointment.doctorId !== doctorId) {
      throw new QueueError(
        'Doctor does not match the scheduled appointment',
        400,
        'DOCTOR_MISMATCH'
      );
    }

    // 5. Patient ID consistency check if provided
    if (patientId && Number(appointment.patientId) !== Number(patientId)) {
      throw new QueueError(
        'Patient ID does not match the scheduled appointment',
        400,
        'PATIENT_MISMATCH'
      );
    }

    // 6. Concurrency / Duplicate check-in safeguard
    const existingQueue = await tx.queue.findFirst({
      where: {
        appointmentId,
        status: { notIn: ['CANCELLED'] },
      },
    });

    if (existingQueue) {
      throw new QueueError(
        'Patient already checked in for this appointment',
        409,
        'ALREADY_CHECKED_IN'
      );
    }

    // 7. Atomic state transition: Appointment -> ARRIVED
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'ARRIVED' },
    });

    // 8. Atomic queue record creation: Queue -> WAITING
    const queueRecord = await tx.queue.create({
      data: {
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        status: 'WAITING',
        checkInTime: new Date(),
      },
      include: {
        patient: true,
        appointment: {
          include: { doctor: true },
        },
      },
    });

    return queueRecord;
  });
}

/**
 * Queue Status Transition Workflow
 * Restricted to staff roles. Validates state allowlist and legal transitions.
 * Synchronizes linked Appointment status.
 */
export async function updateQueueStatus({
  user,
  queueId,
  newStatus,
  prisma,
}) {
  const role = normalizeRole(user?.role);
  if (role === 'PATIENT' || !STAFF_ROLES.includes(role)) {
    throw new QueueError(
      'Forbidden: Only authorized hospital staff can modify queue status',
      403,
      'STAFF_AUTHORIZATION_REQUIRED'
    );
  }

  if (!ALLOWED_QUEUE_STATUSES.includes(newStatus)) {
    throw new QueueError(
      `Invalid queue status "${newStatus}". Must be one of: ${ALLOWED_QUEUE_STATUSES.join(', ')}`,
      400,
      'INVALID_STATUS'
    );
  }

  const activePrisma = await getPrismaClient(prisma);

  return await activePrisma.$transaction(async (tx) => {
    const currentQueue = await tx.queue.findUnique({
      where: { id: queueId },
      include: { appointment: true },
    });

    if (!currentQueue) {
      throw new QueueError('Queue item not found', 404, 'QUEUE_ITEM_NOT_FOUND');
    }

    // Validate transition
    const allowedNext = VALID_QUEUE_TRANSITIONS[currentQueue.status] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new QueueError(
        `Invalid status transition from "${currentQueue.status}" to "${newStatus}". Allowed transitions: ${allowedNext.join(', ') || 'none (terminal state)'}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updateData = { status: newStatus };
    if (newStatus === 'COMPLETED') {
      updateData.completedTime = new Date();
    }

    const updatedQueue = await tx.queue.update({
      where: { id: queueId },
      data: updateData,
      include: {
        patient: true,
        appointment: {
          include: { doctor: true },
        },
      },
    });

    // Synchronize Appointment status
    if (newStatus === 'IN_PROGRESS') {
      await tx.appointment.update({
        where: { id: currentQueue.appointmentId },
        data: { status: 'IN_CONSULTATION' },
      });
    } else if (newStatus === 'COMPLETED') {
      await tx.appointment.update({
        where: { id: currentQueue.appointmentId },
        data: { status: 'COMPLETED' },
      });
    } else if (newStatus === 'CANCELLED') {
      await tx.appointment.update({
        where: { id: currentQueue.appointmentId },
        data: { status: 'CANCELLED' },
      });
    }

    return updatedQueue;
  });
}

/**
 * List Queue items scoped by role
 * Patients only see their own queue records; staff can see all or filter.
 */
export async function listQueueItems({ user, doctorId, status, prisma }) {
  const role = normalizeRole(user?.role);
  const where = {};

  if (role === 'PATIENT') {
    const userPatientId = user?.patientId !== undefined && user?.patientId !== null
      ? Number(user.patientId)
      : (Number.isInteger(Number(user?.id)) ? Number(user.id) : null);

    if (!userPatientId) {
      throw new QueueError('Forbidden: Unable to resolve patient identity', 403, 'PATIENT_UNRESOLVED');
    }
    where.patientId = userPatientId;
  } else {
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;
  }

  const activePrisma = await getPrismaClient(prisma);

  return await activePrisma.queue.findMany({
    where,
    include: {
      patient: true,
      appointment: {
        include: { doctor: true },
      },
    },
    orderBy: { checkInTime: 'asc' },
  });
}

/**
 * Get single queue item by ID with ownership scoping
 */
export async function getQueueItemById({ user, queueId, prisma }) {
  const activePrisma = await getPrismaClient(prisma);

  const queueItem = await activePrisma.queue.findUnique({
    where: { id: queueId },
    include: {
      patient: true,
      appointment: {
        include: { doctor: true },
      },
    },
  });

  if (!queueItem) {
    throw new QueueError('Queue item not found', 404, 'NOT_FOUND');
  }

  const role = normalizeRole(user?.role);
  if (role === 'PATIENT') {
    const userPatientId = user?.patientId !== undefined && user?.patientId !== null
      ? Number(user.patientId)
      : (Number.isInteger(Number(user?.id)) ? Number(user.id) : null);
    if (queueItem.patientId !== userPatientId) {
      throw new QueueError('Forbidden: Access denied to this queue item', 403, 'FORBIDDEN');
    }
  }

  return queueItem;
}

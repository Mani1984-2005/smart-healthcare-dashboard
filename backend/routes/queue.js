// backend/routes/queue.js
// Enterprise Queue Management Routes — role-based access control and validation

import express from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import * as queueController from '../controllers/queueController.js';

const router = express.Router();

// Ensure authentication for all queue operations
router.use(authenticate);

// 1. List queue items: Staff see all; Patients see only their own queue records
router.get(
  '/',
  authorize(['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT']),
  queueController.listQueues
);

// 2. Patient or staff check-in: PATIENT may check in only for own appointment; Staff may proxy check-in
router.post(
  '/checkin',
  authorize(['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT']),
  queueController.checkIn
);

// 3. Get single queue item
router.get(
  '/:id',
  authorize(['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT']),
  queueController.getQueueById
);

// 4. Update queue status: STRICTLY restricted to clinical/administrative hospital staff
router.put(
  '/:id/status',
  authorize(['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  queueController.updateStatus
);

export default router;

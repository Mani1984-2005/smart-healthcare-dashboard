// backend/controllers/queueController.js
// Enterprise Queue Management Controller — HTTP request handling & canonical response envelopes

import {
  checkInPatient,
  updateQueueStatus,
  listQueueItems,
  getQueueItemById,
  QueueError,
} from '../services/queueService.js';

export async function checkIn(req, res) {
  try {
    const { appointmentId, patientId, doctorId } = req.body || {};
    const queueRecord = await checkInPatient({
      user: req.user,
      appointmentId,
      patientId,
      doctorId,
    });

    return res.status(201).json({
      success: true,
      data: queueRecord,
    });
  } catch (error) {
    if (error instanceof QueueError) {
      return res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    console.error('[queueController.checkIn] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process check-in request',
      },
    });
  }
}

export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const updatedQueue = await updateQueueStatus({
      user: req.user,
      queueId: id,
      newStatus: status,
    });

    return res.json({
      success: true,
      data: updatedQueue,
    });
  } catch (error) {
    if (error instanceof QueueError) {
      return res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    console.error('[queueController.updateStatus] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update queue status',
      },
    });
  }
}

export async function listQueues(req, res) {
  try {
    const { doctorId, status } = req.query || {};
    const queues = await listQueueItems({
      user: req.user,
      doctorId,
      status,
    });

    return res.json({
      success: true,
      data: queues,
    });
  } catch (error) {
    if (error instanceof QueueError) {
      return res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    console.error('[queueController.listQueues] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve queue items',
      },
    });
  }
}

export async function getQueueById(req, res) {
  try {
    const { id } = req.params;
    const queueItem = await getQueueItemById({
      user: req.user,
      queueId: id,
    });

    return res.json({
      success: true,
      data: queueItem,
    });
  } catch (error) {
    if (error instanceof QueueError) {
      return res.status(error.status).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    console.error('[queueController.getQueueById] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve queue item',
      },
    });
  }
}

import { logger } from '../../utils/logger.js';

// Readiness stub for Twilio/SNS/MSG91 etc.
export const smsChannel = {
  name: 'sms',
  async send(notification, recipient) {
    if (!recipient?.phone) return { sent: false, reason: 'No phone on file' };
    // Phase 2F / task C: the stub log deliberately omits the destination
    // phone number and the notification title (both patient data) — it only
    // records that the channel fired, keyed by recipient id + category.
    logger.info('[sms:stub] would send SMS', { userId: recipient.id, category: notification.category });
    return { sent: true, transport: 'stub' };
  },
};

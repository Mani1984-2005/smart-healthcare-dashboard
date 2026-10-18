import { logger } from '../../utils/logger.js';

// Readiness stub for Twilio/SNS/MSG91 etc.
export const smsChannel = {
  name: 'sms',
  async send(notification, recipient) {
    if (!recipient?.phone) return { sent: false, reason: 'No phone on file' };
    logger.info('[sms:stub] would send SMS', { to: recipient.phone, title: notification.title });
    return { sent: true, transport: 'stub' };
  },
};

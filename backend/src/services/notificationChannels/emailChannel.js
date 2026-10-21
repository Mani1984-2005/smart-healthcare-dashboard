import { logger } from '../../utils/logger.js';

// Readiness stub: real deployments inject an SMTP/SES/SendGrid client here.
// Kept behind the same NotificationChannel interface as every other
// channel so notification.service.js never branches on transport.
export const emailChannel = {
  name: 'email',
  async send(notification, recipient) {
    if (!recipient?.email) return { sent: false, reason: 'No email on file' };
    // Phase 2F / task C: the stub log deliberately omits the destination
    // email address and the notification title (both patient data) — it only
    // records that the channel fired, keyed by recipient id + category.
    logger.info('[email:stub] would send email', { userId: recipient.id, category: notification.category });
    return { sent: true, transport: 'stub' };
  },
};

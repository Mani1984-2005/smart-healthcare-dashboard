import { logger } from '../../utils/logger.js';

// Readiness stub: real deployments inject an SMTP/SES/SendGrid client here.
// Kept behind the same NotificationChannel interface as every other
// channel so notification.service.js never branches on transport.
export const emailChannel = {
  name: 'email',
  async send(notification, recipient) {
    if (!recipient?.email) return { sent: false, reason: 'No email on file' };
    logger.info('[email:stub] would send email', { to: recipient.email, title: notification.title });
    return { sent: true, transport: 'stub' };
  },
};

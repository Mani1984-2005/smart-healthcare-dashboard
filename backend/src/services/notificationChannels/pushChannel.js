import { logger } from '../../utils/logger.js';

// Readiness stub for FCM/APNs/web-push.
export const pushChannel = {
  name: 'push',
  async send(notification, recipient) {
    // Phase 2F / task C: the stub log records only that the channel fired
    // (recipient id + category) — never the notification title, which can
    // carry patient data.
    logger.info('[push:stub] would send push notification', { userId: recipient?.id, category: notification.category });
    return { sent: true, transport: 'stub' };
  },
};

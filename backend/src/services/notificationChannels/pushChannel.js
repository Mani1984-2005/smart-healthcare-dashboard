import { logger } from '../../utils/logger.js';

// Readiness stub for FCM/APNs/web-push.
export const pushChannel = {
  name: 'push',
  async send(notification, recipient) {
    logger.info('[push:stub] would send push notification', { userId: recipient?.id, title: notification.title });
    return { sent: true, transport: 'stub' };
  },
};

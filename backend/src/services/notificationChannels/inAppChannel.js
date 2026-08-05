import * as notificationRepo from '../../repositories/notification.repository.js';

// In-app is the only channel with real persistence — it's also the
// system of record the /api/notifications endpoints read from, so every
// dispatch always writes here regardless of which other channels fire.
export const inAppChannel = {
  name: 'in_app',
  async send(notification) {
    return notificationRepo.insertNotification(notification);
  },
};

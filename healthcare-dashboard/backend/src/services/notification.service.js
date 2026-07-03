import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import * as notificationRepo from '../repositories/notification.repository.js';
import { inAppChannel } from './notificationChannels/inAppChannel.js';
import { emailChannel } from './notificationChannels/emailChannel.js';
import { smsChannel } from './notificationChannels/smsChannel.js';
import { pushChannel } from './notificationChannels/pushChannel.js';

const CHANNELS = { in_app: inAppChannel, email: emailChannel, sms: smsChannel, push: pushChannel };

/**
 * Fans a notification out to every channel the recipient has opted into
 * (default: in_app only). Each channel implements the same {name, send()}
 * interface, so adding a real email/SMS/push provider later means writing
 * one new file, not touching this function or any caller.
 */
export async function dispatch({ userId, category, title, body, entityType, entityId, priority = 'normal', recipient }) {
  const prefs = await notificationRepo.getPreferences(userId);
  const mutedCategories = new Set(prefs?.categories_muted || []);
  if (mutedCategories.has(category)) {
    logger.debug('Notification suppressed by user preference', { userId, category });
    return { suppressed: true };
  }

  const channelNames = prefs?.channels?.length ? prefs.channels : ['in_app'];
  const notification = { userId, category, title, body, entityType, entityId, priority };

  const results = {};
  let persisted = null;
  for (const name of channelNames) {
    const channel = CHANNELS[name];
    if (!channel) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await channel.send(notification, recipient);
      results[name] = result;
      if (name === 'in_app') persisted = result;
    } catch (err) {
      logger.error('Notification channel failed', { channel: name, error: err.message });
      results[name] = { sent: false, error: err.message };
    }
  }

  // Guarantee an in-app record exists even if the user's preferences
  // somehow exclude it, so the notification bell / audit trail never
  // silently drops an event.
  if (!persisted) {
    persisted = await inAppChannel.send(notification);
    results.in_app = persisted;
  }

  return { notification: persisted, channelResults: results };
}

export async function listForUser(userId, options) {
  return notificationRepo.listForUser(userId, options);
}

export async function markRead(id, userId) {
  const updated = await notificationRepo.markRead(id, userId);
  if (!updated) throw AppError.notFound('Notification not found or already read.');
  return updated;
}

export async function markAllRead(userId) {
  return notificationRepo.markAllRead(userId);
}

export async function unreadCount(userId) {
  return notificationRepo.countUnread(userId);
}

export async function getPreferences(userId) {
  const prefs = await notificationRepo.getPreferences(userId);
  return prefs || { user_id: userId, channels: ['in_app'], categories_muted: [] };
}

export async function updatePreferences(userId, { channels, categoriesMuted }) {
  return notificationRepo.upsertPreferences(userId, { channels, categoriesMuted });
}

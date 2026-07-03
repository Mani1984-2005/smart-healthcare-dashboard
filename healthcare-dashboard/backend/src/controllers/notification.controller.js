import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import * as notificationService from '../services/notification.service.js';

function requireUser(req) {
  if (!req.user?.id) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return req.user.id;
}

export const listMyNotifications = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const { unreadOnly } = req.query;
  const rows = await notificationService.listForUser(userId, {
    unreadOnly: unreadOnly === 'true',
    limit: req.pagination?.limit,
    offset: req.pagination?.offset,
  });
  const count = await notificationService.unreadCount(userId);
  res.json({ success: true, data: rows, meta: { unreadCount: count } });
});

export const markRead = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const updated = await notificationService.markRead(req.params.id, userId);
  res.json({ success: true, data: updated });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const count = await notificationService.markAllRead(userId);
  res.json({ success: true, data: { markedRead: count } });
});

export const getPreferences = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const prefs = await notificationService.getPreferences(userId);
  res.json({ success: true, data: prefs });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const userId = requireUser(req);
  const prefs = await notificationService.updatePreferences(userId, req.body || {});
  res.json({ success: true, data: prefs });
});

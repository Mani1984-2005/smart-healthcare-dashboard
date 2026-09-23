/**
 * Local/in-app notification service (single notification architecture).
 *
 * Notifications are persisted to the `Notification` table only. No SMS,
 * email, or WhatsApp delivery is performed — no external provider is
 * configured in this application, and callers/UI must not claim otherwise.
 *
 * Delivery scope: in-app only, read via GET /api/v1/notifications by the
 * owning user (userId + userRole), enforced with RBAC in notificationRoutes.
 *
 * All writes are best-effort: a notification failure must never break the
 * business transaction that triggered it.
 */
import prisma from "../db.js";

/**
 * Persist one notification.
 *
 * @param {object} target
 * @param {string|number} target.userId  - Patient.id (stringified), Doctor.id, or any user uid
 * @param {string} target.userRole       - PATIENT | DOCTOR | NURSE | ... (recipient role scope)
 * @param {string} target.type           - e.g. APPOINTMENT_CREATED, PRESCRIPTION_CREATED
 * @param {string} target.title
 * @param {string} target.message
 * @param {object} [target.data]         - small JSON payload (ids only, no clinical notes)
 */
export async function notify({ userId, userRole, type, title, message, data = undefined }) {
  if (userId === undefined || userId === null || userId === "") return;
  try {
    await prisma.notification.create({
      data: {
        userId: String(userId),
        userRole: String(userRole || "PATIENT"),
        type,
        title,
        message,
        data: data === undefined ? undefined : data,
      },
    });
  } catch (error) {
    // Best-effort only — never fail the triggering workflow.
    console.error("[notifications] persist failed", { type, code: error?.code, message: error?.message });
  }
}

/** Persist several notifications concurrently (best-effort each). */
export async function notifyMany(targets = []) {
  await Promise.all(targets.filter(Boolean).map((t) => notify(t)));
}

export default { notify, notifyMany };
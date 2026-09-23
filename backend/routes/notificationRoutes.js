import express from "express";
import prisma from "../db.js";
import authenticate, { authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(authenticate);

// Get notifications for current user (by role and id)
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const userRole = req.user.role || req.user.roles?.[0] || "PATIENT";
    const notifications = await prisma.notification.findMany({
      where: { userId: String(userId), userRole },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

// Mark a notification as read
router.post("/:id/read", async (req, res) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to mark notification read" });
  }
});

export default router;

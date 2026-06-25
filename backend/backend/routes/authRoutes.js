import express from "express";
import authenticate from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/auth/me
// Protected — requires a valid Firebase ID token in Authorization header
router.get("/me", authenticate, (req, res) => {
  const { uid, email, name, picture } = req.user;

  res.status(200).json({
    success: true,
    user: {
      uid,
      email:   email   ?? null,
      name:    name    ?? null,
      picture: picture ?? null,
    },
  });
});

export default router;
import { Router } from 'express';
import { checkDbConnection } from '../config/db.js';

const router = Router();

router.get('/', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    await checkDbConnection();
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    success: true,
    service: 'medicare-pro-backend',
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;

import { Router } from 'express';
import { getAnalyticsDashboard } from '../controllers/analytics.controller.js';

const router = Router();

router.get('/dashboard', getAnalyticsDashboard);

export default router;

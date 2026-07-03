import { Router } from 'express';
import { advancedSearch } from '../controllers/search.controller.js';

const router = Router();

router.get('/', advancedSearch);

export default router;

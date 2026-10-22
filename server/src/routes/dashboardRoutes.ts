import { Router } from 'express';
import { getDashboardStats, getDashboardActivity } from '../controllers/dashboardController.js';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/activity', getDashboardActivity);

export default router;

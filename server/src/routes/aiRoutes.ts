import { Router } from 'express';
import { analyzeImageStandalone } from '../controllers/reportController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.post('/analyze', upload.single('photo'), analyzeImageStandalone);

export default router;

import { Router } from 'express';
import {
  getReports,
  getReportById,
  getTopWorstPotholes,
  getTopWorstPotholesPdf,
  getHotspots,
  getMapReports,
  createReport,
  updateReportStatus,
  updateAssignment,
  updateSeverity,
  resolveReport,
  upvoteReport,
  addOfficerNote,
  getLiveWeather,
  deleteReport,
  verifyRepairWorkflow,
  submitCommunityVerification,
  confirmRecurrence,
  getRepairTeams,
  getLocalityRoadHealthIndex,
} from '../controllers/reportController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/weather/current', getLiveWeather);
router.get('/health-index', getLocalityRoadHealthIndex);
router.get('/teams', getRepairTeams);
router.get('/top-worst/pdf', getTopWorstPotholesPdf);
router.get('/top-worst', getTopWorstPotholes);
router.get('/hotspots', getHotspots);
router.get('/map', getMapReports);
router.get('/', getReports);
router.get('/:id', getReportById);

router.post('/', upload.single('photo'), createReport);
router.patch('/:id/status', updateReportStatus);
router.patch('/:id/assignment', updateAssignment);
router.patch('/:id/severity', updateSeverity);
router.patch('/:id/recurrence', confirmRecurrence);
router.delete('/:id', deleteReport);

router.post('/:id/resolve', upload.single('afterPhoto'), resolveReport);
router.post('/:id/verify-repair', upload.single('afterPhoto'), verifyRepairWorkflow);
router.post('/:id/community-verify', upload.single('photo'), submitCommunityVerification);
router.post('/:id/upvote', upvoteReport);
router.post('/:id/notes', addOfficerNote);

export default router;

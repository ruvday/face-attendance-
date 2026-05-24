import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { registerFace, checkIn, getHistory, getProfile } from '../controllers/employee.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(['employee']));
router.use(requireTenant);

router.get('/profile', getProfile);
router.post('/face/register', registerFace);
router.post('/attendance/scan', checkIn);
router.get('/attendance/history', getHistory);

export default router;

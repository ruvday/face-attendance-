import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { getEmployees, createEmployee, getAttendance } from '../controllers/admin.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(['admin']));
router.use(requireTenant);

router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.get('/attendance', getAttendance);

export default router;

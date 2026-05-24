import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getTenants, createTenant, getAdmins, createAdmin } from '../controllers/superadmin.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(['super_admin']));

router.get('/tenants', getTenants);
router.post('/tenants', createTenant);

router.get('/admins', getAdmins);
router.post('/admins', createAdmin);

export default router;

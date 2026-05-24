import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getTenants, createTenant, getAdmins, createAdmin, deleteAdmin, deleteTenant } from '../controllers/superadmin.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(['super_admin']));

router.get('/tenants', getTenants);
router.post('/tenants', createTenant);
router.delete('/tenants/:id', deleteTenant);

router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.delete('/admins/:id', deleteAdmin);

export default router;

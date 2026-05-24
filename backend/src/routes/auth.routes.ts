import express from 'express';
import { login, employeeLogin } from '../controllers/auth.controller';

const router = express.Router();

router.post('/login', login);
router.post('/employee-login', employeeLogin);

export default router;

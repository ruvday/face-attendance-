import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabase';
import { env } from '../config/env';

// ── Admin / Super-admin login ─────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input types.' });
    }

    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('id, tenant_id, email, password_hash, full_name, is_active, roles(name)')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (dbError) {
      console.error('[login] DB error:', dbError);
      return res.status(500).json({ error: 'Internal server error.' });
    }

    const user = users?.[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const role = (user as any).roles?.name || 'employee';

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenant_id, role, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.json({
      token,
      user: {
        id:        user.id,
        email:     user.email,
        full_name: user.full_name,
        role,
        tenant_id: user.tenant_id,
      },
    });

  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ── Employee PIN login ────────────────────────────────────────────────────────
export const employeeLogin = async (req: Request, res: Response) => {
  try {
    const { loginCode } = req.body;

    if (!loginCode) {
      return res.status(400).json({ error: 'Login code is required.' });
    }
    // Validate: must be 4–6 digits only
    if (!/^\d{4,6}$/.test(String(loginCode))) {
      return res.status(400).json({ error: 'Login code must be 4–6 digits.' });
    }

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('user_id, tenant_id, is_active, users(email, full_name)')
      .eq('login_code', String(loginCode))
      .maybeSingle();

    if (empError) {
      console.error('[employeeLogin] DB error:', empError);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    if (!employee) {
      return res.status(401).json({ error: 'Invalid login code.' });
    }
    if (!employee.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
    }

    const userData = (employee as any).users;
    const email    = userData?.email    ?? '';
    const fullName = userData?.full_name ?? '';

    const token = jwt.sign(
      { id: employee.user_id, tenant_id: employee.tenant_id, role: 'employee', email },
      env.JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.json({
      token,
      user: {
        id:        employee.user_id,
        email,
        full_name: fullName,
        role:      'employee',
        tenant_id: employee.tenant_id,
      },
    });

  } catch (err) {
    console.error('[employeeLogin]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabase';
import { env } from '../config/env';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('id, tenant_id, email, password_hash, is_active, roles(name)')
      .eq('email', email)
      .limit(1);

    if (dbError) {
      console.error('DB error:', dbError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const user = users?.[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role = (user as any).roles?.name || 'employee';

    const token = jwt.sign(
      { 
        id: user.id, 
        tenant_id: user.tenant_id, 
        role: role, 
        email: user.email 
      },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: role,
        tenant_id: user.tenant_id
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const employeeLogin = async (req: Request, res: Response) => {
  try {
    const { loginCode } = req.body;

    if (!loginCode) {
      return res.status(400).json({ error: 'Login code is required' });
    }

    // Find employee by login_code globally
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('user_id, tenant_id, is_active, users(email, full_name)')
      .eq('login_code', loginCode)
      .maybeSingle();

    if (empError || !employee) {
      return res.status(401).json({ error: 'Invalid login code' });
    }

    if (!employee.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const email = (employee as any).users?.email || '';

    const token = jwt.sign(
      { 
        id: employee.user_id, 
        tenant_id: employee.tenant_id, 
        role: 'employee', 
        email: email 
      },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: employee.user_id,
        email: email,
        role: 'employee',
        tenant_id: employee.tenant_id
      }
    });

  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

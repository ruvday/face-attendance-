import { Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcrypt';

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const result = await pool.query(`
      SELECT e.*, u.email, u.full_name, u.phone 
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.tenant_id = $1
    `, [tenantId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantId = req.user!.tenant_id;
    const { email, password, fullName, employeeCode, department, position } = req.body;

    const hash = await bcrypt.hash(password, 10);
    
    const userResult = await client.query(`
      INSERT INTO users (tenant_id, role_id, email, password_hash, full_name)
      VALUES ($1, (SELECT id FROM roles WHERE name = 'employee'), $2, $3, $4)
      RETURNING id
    `, [tenantId, email, hash, fullName]);
    const userId = userResult.rows[0].id;

    await client.query(`
      INSERT INTO employees (tenant_id, user_id, employee_code, department, position)
      VALUES ($1, $2, $3, $4, $5)
    `, [tenantId, userId, employeeCode, department, position]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Employee created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create employee' });
  } finally {
    client.release();
  }
};

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      SELECT a.*, e.employee_code, u.full_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE a.tenant_id = $1 AND a.date = $2
      ORDER BY a.created_at DESC
    `, [tenantId, date]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

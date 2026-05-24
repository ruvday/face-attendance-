import { Request, Response } from 'express';
import { pool } from '../db';
import bcrypt from 'bcrypt';

export const getTenants = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM tenants ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, slug, adminEmail, adminPassword, adminName } = req.body;

    // Create tenant
    const tenantResult = await client.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id',
      [name, slug]
    );
    const tenantId = tenantResult.rows[0].id;

    // Create admin user
    const hash = await bcrypt.hash(adminPassword, 10);
    await client.query(`
      INSERT INTO users (tenant_id, role_id, email, password_hash, full_name)
      VALUES ($1, (SELECT id FROM roles WHERE name = 'admin'), $2, $3, $4)
    `, [tenantId, adminEmail, hash, adminName]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Tenant created successfully', tenantId });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create tenant' });
  } finally {
    client.release();
  }
};

export const getAdmins = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.full_name, u.is_active, u.created_at, t.name as tenant_name, t.id as tenant_id
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.role_id = (SELECT id FROM roles WHERE name = 'admin')
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { tenantId, email, password, fullName } = req.body;
    const hash = await bcrypt.hash(password, 10);
    await pool.query(`
      INSERT INTO users (tenant_id, role_id, email, password_hash, full_name)
      VALUES ($1, (SELECT id FROM roles WHERE name = 'admin'), $2, $3, $4)
    `, [tenantId, email, hash, fullName]);
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const adminId = req.params.id;
    const result = await pool.query(
      `DELETE FROM users 
       WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE name = 'admin')`,
      [adminId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete admin' });
  }
};

export const deleteTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;
    const result = await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
};


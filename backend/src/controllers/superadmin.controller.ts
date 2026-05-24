import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import bcrypt from 'bcrypt';

export const getTenants = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  try {
    const { name, slug, adminEmail, adminPassword, adminName } = req.body;

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name, slug })
      .select('id')
      .single();

    if (tenantError) throw tenantError;

    // Get admin role id
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    // Create admin user
    const hash = await bcrypt.hash(adminPassword, 10);
    const { error: userError } = await supabase
      .from('users')
      .insert({
        tenant_id: tenant.id,
        role_id: role!.id,
        email: adminEmail,
        password_hash: hash,
        full_name: adminName,
      });

    if (userError) {
      // Rollback tenant creation
      await supabase.from('tenants').delete().eq('id', tenant.id);
      throw userError;
    }

    res.status(201).json({ message: 'Tenant created successfully', tenantId: tenant.id });
  } catch (error: any) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: error.message || 'Failed to create tenant' });
  }
};

export const getAdmins = async (req: Request, res: Response) => {
  try {
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, is_active, created_at, tenant_id, tenants(name)')
      .eq('role_id', role!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten tenant name
    const result = (data || []).map((u: any) => ({
      ...u,
      tenant_name: u.tenants?.name || null,
      tenants: undefined,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { tenantId, email, password, fullName } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    const { error } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        role_id: role!.id,
        email,
        password_hash: hash,
        full_name: fullName,
      });

    if (error) throw error;
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const adminId = req.params.id;

    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single();

    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', adminId)
      .eq('role_id', role!.id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
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
    const { data, error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
};

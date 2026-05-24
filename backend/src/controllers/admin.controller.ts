import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import bcrypt from 'bcrypt';

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const { data, error } = await supabase
      .from('employees')
      .select('*, users(full_name)')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Flatten user data
    const result = (data || []).map((e: any) => ({
      ...e,
      full_name: e.users?.full_name,
      users: undefined,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const { fullName, employeeCode, department, position } = req.body;

    // Generate random 6 digit code
    let loginCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Ensure global uniqueness
    let isUnique = false;
    for(let i=0; i<10; i++) {
      const { data } = await supabase.from('employees').select('id').eq('login_code', loginCode).maybeSingle();
      if (!data) {
        isUnique = true;
        break;
      }
      loginCode = Math.floor(100000 + Math.random() * 900000).toString();
    }
    if (!isUnique) throw new Error('Failed to generate unique login code');

    const pseudoEmail = `emp_${loginCode}_${tenantId!.substring(0,8)}@faceatend.local`;
    const hash = await bcrypt.hash(loginCode, 10); // dummy password

    // Get employee role id
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'employee')
      .single();

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        role_id: role!.id,
        email: pseudoEmail,
        password_hash: hash,
        full_name: fullName,
      })
      .select('id')
      .single();

    if (userError) throw userError;

    // Create employee record
    const { error: empError } = await supabase
      .from('employees')
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        employee_code: employeeCode,
        login_code: loginCode,
        department,
        position,
      });

    if (empError) {
      // Rollback user creation
      await supabase.from('users').delete().eq('id', user.id);
      throw empError;
    }

    res.status(201).json({ message: 'Employee created successfully', loginCode });
  } catch (error: any) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: error.message || 'Failed to create employee' });
  }
};

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance')
      .select('*, employees(employee_code, users(full_name))')
      .eq('tenant_id', tenantId)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten
    const result = (data || []).map((a: any) => ({
      ...a,
      employee_code: a.employees?.employee_code,
      full_name: a.employees?.users?.full_name,
      employees: undefined,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const employeeId = req.params.id;

    // Get user_id from employee
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', employeeId)
      .eq('tenant_id', tenantId)
      .single();

    if (empError || !emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete user (cascade will delete employee)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', emp.user_id)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

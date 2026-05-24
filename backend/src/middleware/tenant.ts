import { Request, Response, NextFunction } from 'express';

// Ensure the user is accessing data for their own tenant
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Super admins can bypass tenant checks if needed, but usually they operate on global routes
  if (req.user.role === 'super_admin') {
    return next();
  }

  if (!req.user.tenant_id) {
    return res.status(403).json({ error: 'Forbidden: User does not belong to a tenant' });
  }

  // For routes that specify a tenant_id param, ensure it matches
  if (req.params.tenantId && req.params.tenantId !== req.user.tenant_id) {
    return res.status(403).json({ error: 'Forbidden: Cannot access other tenant data' });
  }

  next();
};

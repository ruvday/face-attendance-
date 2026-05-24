import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import { Plus, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default function Admins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ tenantId: '', fullName: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAdmins();
    loadTenants();
  }, []);

  const loadAdmins = async () => {
    try {
      const res = await api.get('/super/admins');
      setAdmins(res.data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load admins', variant: 'destructive' });
    }
  };

  const loadTenants = async () => {
    try {
      const res = await api.get('/super/tenants');
      setTenants(res.data);
      if (res.data.length > 0) {
        setFormData(prev => ({ ...prev, tenantId: res.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load tenants for dropdown', err);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId) {
      toast({ title: 'Error', description: 'Please select a company/tenant', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/super/admins', formData);
      toast({ title: 'Success', description: 'Admin created successfully' });
      setIsDialogOpen(false);
      setFormData({ tenantId: tenants[0]?.id || '', fullName: '', email: '', password: '' });
      loadAdmins();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create admin', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Administrators</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system administrators for each registered company/tenant.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Add Administrator
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddAdmin}>
              <DialogHeader>
                <DialogTitle>Add Company Administrator</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="tenantId">Company / Tenant</Label>
                  <select
                    id="tenantId"
                    required
                    value={formData.tenantId}
                    onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                  >
                    <option value="" disabled>Select a tenant</option>
                    {tenants.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Alex Smith" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="admin@company.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? 'Creating...' : 'Create Admin'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Associated Tenant</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-slate-500">No administrators found</TableCell>
              </TableRow>
            ) : (
              admins.map((admin: any) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span>{admin.full_name}</span>
                  </TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.tenant_name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      Tenant Admin
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      admin.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

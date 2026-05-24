import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default function Tenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', adminName: '', adminEmail: '', adminPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const res = await api.get('/super/tenants');
      setTenants(res.data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load tenants', variant: 'destructive' });
    }
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/super/tenants', formData);
      toast({ title: 'Success', description: 'Tenant created successfully' });
      setIsDialogOpen(false);
      setFormData({ name: '', slug: '', adminName: '', adminEmail: '', adminPassword: '' });
      loadTenants();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create tenant', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete company tenant "${name}"?\n\nThis will completely delete all associated company administrators, registered employees, database settings, and attendance logs. This action cannot be undone.`)) {
      try {
        await api.delete(`/super/tenants/${id}`);
        toast({ title: 'Success', description: 'Tenant deleted successfully' });
        loadTenants();
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to delete tenant', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants (Companies)</h1>
          <p className="text-slate-500 text-sm mt-1">Register and manage enterprise organizations on the SaaS platform.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddTenant}>
              <DialogHeader>
                <DialogTitle>Add New Tenant</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Acme Corp" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">Company Slug</Label>
                  <Input id="slug" required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="acme" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input id="adminName" required value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} placeholder="John Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input id="adminEmail" type="email" required value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} placeholder="admin@acme.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input id="adminPassword" type="password" required value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Tenant'}
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
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-slate-500">No tenants found</TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant: any) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell className="capitalize font-medium text-blue-600 dark:text-blue-400">{tenant.plan}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      tenant.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {tenant.status}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(tenant.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

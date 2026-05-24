import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import { Plus, UserPlus, Fingerprint } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    employeeCode: '',
    department: '',
    position: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await api.get('/admin/employees');
      setEmployees(res.data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/admin/employees', formData);
      toast({ title: 'Success', description: 'Employee created successfully' });
      setIsDialogOpen(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        employeeCode: '',
        department: '',
        position: ''
      });
      loadEmployees();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create employee', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-slate-500 text-sm mt-1">Manage personnel, view facial recognition registrations, and assign codes.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddEmployee}>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Jane Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="jane@company.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Login Password</Label>
                  <Input id="password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="employeeCode">Employee Code</Label>
                  <Input id="employeeCode" required value={formData.employeeCode} onChange={e => setFormData({ ...formData, employeeCode: e.target.value })} placeholder="EMP1024" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="Engineering" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position / Job Title</Label>
                  <Input id="position" required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} placeholder="Software Engineer" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? 'Creating...' : 'Create Employee'}
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Face Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-slate-500">No employees found</TableCell>
              </TableRow>
            ) : (
              employees.map((emp: any) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{emp.employee_code || 'N/A'}</TableCell>
                  <TableCell className="font-medium flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-slate-400" />
                    <span>{emp.full_name}</span>
                  </TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>{emp.department || 'N/A'}</TableCell>
                  <TableCell>{emp.position || 'N/A'}</TableCell>
                  <TableCell>
                    {emp.face_registered_at ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <Fingerprint className="w-3 h-3 mr-1" /> Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        Pending Registration
                      </span>
                    )}
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

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Building2, Users } from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ tenants: 0, activeTenants: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/super/tenants');
        const tenants = res.data;
        setStats({
          tenants: tenants.length,
          activeTenants: tenants.filter((t: any) => t.status === 'active').length
        });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tenants}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTenants}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

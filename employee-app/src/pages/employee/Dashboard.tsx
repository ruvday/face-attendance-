import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuthStore } from '../../store/auth';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.email}</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-400">Not Checked In</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

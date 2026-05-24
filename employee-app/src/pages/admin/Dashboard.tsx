import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, CalendarCheck, Clock, AlertTriangle } from 'lucide-react';
import { io } from 'socket.io-client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const { token } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [empRes, attRes] = await Promise.all([
          api.get('/admin/employees'),
          api.get('/admin/attendance')
        ]);
        
        const total = empRes.data.length;
        const present = attRes.data.length;
        const late = attRes.data.filter((a: any) => new Date(a.check_in_at).getHours() >= 9).length; // naive late check
        const absent = total - present;

        setStats({ total, present, late, absent });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      }
    };
    fetchStats();

    // Socket.io initialization
    const socket = io('http://localhost:5001', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected to real-time attendance server');
    });

    socket.on('attendance_marked', (data) => {
      toast({
        title: 'New Check-in 📸',
        description: `${data.fullName} just marked attendance!`,
      });
      // Optimistically update stats
      setStats(prev => ({
        ...prev,
        present: prev.present + 1,
        absent: Math.max(0, prev.absent - 1)
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, toast]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Check-ins</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absent}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

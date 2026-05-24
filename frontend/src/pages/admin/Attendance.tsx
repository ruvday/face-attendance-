import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../hooks/use-toast';
import { Calendar, MapPin, Laptop, Percent } from 'lucide-react';
import { Input } from '../../components/ui/input';

export default function Attendance() {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  const loadAttendance = async () => {
    try {
      const res = await api.get(`/admin/attendance?date=${selectedDate}`);
      setLogs(res.data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load attendance logs', variant: 'destructive' });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Review biometric check-ins, check-outs, GPS location, and devices.</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <Calendar className="w-5 h-5 text-slate-500" />
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-0 focus-visible:ring-0 w-40 h-8"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>GPS Location</TableHead>
              <TableHead>Device Fingerprint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No attendance logs found for this date.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => {
                const loc = log.location;
                const fingerprint = log.device_fingerprint;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-semibold">{log.employee_code || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{log.full_name}</TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">
                      {formatTime(log.check_in_at)}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">
                      {formatTime(log.check_out_at)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusBadgeClass(log.status)}`}>
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.face_confidence ? (
                        <span className="flex items-center text-sm font-medium text-slate-900 dark:text-white">
                          <Percent className="w-3.5 h-3.5 mr-0.5 text-blue-500" />
                          {Math.round(log.face_confidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {loc && loc.latitude && loc.longitude ? (
                        <a 
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium space-x-1"
                        >
                          <MapPin className="w-3.5 h-3.5 mr-0.5 text-red-500" />
                          <span>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 flex items-center text-xs">
                          <MapPin className="w-3.5 h-3.5 mr-0.5 text-slate-300" />
                          No GPS data
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {fingerprint ? (
                        <div className="flex items-center text-slate-500 dark:text-slate-400 text-xs font-mono max-w-[120px] truncate" title={fingerprint}>
                          <Laptop className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
                          <span>{fingerprint}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Unknown</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

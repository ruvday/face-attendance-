import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useToast } from '../../hooks/use-toast';
import { Calendar, MapPin, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await api.get('/employee/attendance/history');
      setHistory(res.data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load attendance history', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" /> Present
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" /> Late
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="w-3 h-3 mr-1" /> Absent
          </span>
        );
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Attendance History</h1>
        <p className="text-slate-500 text-sm mt-1">Review your personal check-ins, check-outs, GPS stamps, and match history.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>GPS stamp</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading your history...</TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No attendance records found yet. Go mark your first scan!
                </TableCell>
              </TableRow>
            ) : (
              history.map((log: any) => {
                const loc = log.location;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-semibold flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                      {formatTime(log.check_in_at)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                      {formatTime(log.check_out_at)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.status)}
                    </TableCell>
                    <TableCell>
                      {loc && loc.latitude && loc.longitude ? (
                        <a 
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700 hover:underline text-xs font-semibold space-x-1"
                        >
                          <MapPin className="w-3.5 h-3.5 mr-0.5 text-red-500" />
                          <span>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-0.5 text-slate-300" />
                          No location
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.face_confidence ? (
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {Math.round(log.face_confidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">--</span>
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

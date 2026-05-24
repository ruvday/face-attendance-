import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { MapPin, CheckCircle2, Clock, AlertTriangle, LogIn, LogOut } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
  face_confidence: number | null;
  location: { latitude: number; longitude: number } | null;
}

interface Group {
  label: string;
  records: AttendanceRecord[];
}

function groupRecords(records: AttendanceRecord[]): Group[] {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const groups: Group[] = [
    { label: 'TODAY', records: [] },
    { label: 'YESTERDAY', records: [] },
    { label: 'THIS WEEK', records: [] },
    { label: 'OLDER', records: [] },
  ];

  for (const r of records) {
    const d = new Date(r.date); d.setHours(0,0,0,0);
    if (d.getTime() === today.getTime()) groups[0].records.push(r);
    else if (d.getTime() === yesterday.getTime()) groups[1].records.push(r);
    else if (d >= weekAgo) groups[2].records.push(r);
    else groups[3].records.push(r);
  }

  return groups.filter(g => g.records.length > 0);
}

function fmt(iso: string | null) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function History() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/employee/attendance/history')
      .then(r => setGroups(groupRecords(r.data || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s: string) => {
    if (s === 'present') return 'bg-green-500';
    if (s === 'late') return 'bg-amber-500';
    return 'bg-red-500';
  };

  const StatusIcon = ({ s }: { s: string }) => {
    if (s === 'present') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (s === 'late') return <Clock className="w-4 h-4 text-amber-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="pb-4">
      <h1 className="text-xl font-black text-slate-900 dark:text-white mb-5">My Attendance</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Clock className="w-10 h-10 opacity-40" />
          </div>
          <p className="font-semibold text-slate-500">No records yet</p>
          <p className="text-sm text-center">Scan your face to mark your first attendance</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-slate-400 dark:text-slate-500 tracking-widest">{group.label}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs text-slate-400">{group.records.length}</span>
              </div>

              {/* Records */}
              <div className="space-y-2">
                {group.records.map(r => (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm flex"
                  >
                    {/* Color strip */}
                    <div className={`w-1.5 shrink-0 ${statusColor(r.status)}`} />

                    <div className="flex-1 px-4 py-3">
                      {/* Date */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmtDate(r.date)}</p>
                        <StatusIcon s={r.status} />
                      </div>

                      {/* Times */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                            <LogIn className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">{fmt(r.check_in_at)}</span>
                        </div>

                        {r.check_out_at && (
                          <>
                            <div className="w-4 h-px bg-slate-200 dark:bg-slate-700" />
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                <LogOut className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              </div>
                              <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">{fmt(r.check_out_at)}</span>
                            </div>
                          </>
                        )}

                        {/* Confidence */}
                        {r.face_confidence && (
                          <span className="ml-auto text-xs text-slate-400 font-mono">
                            {Math.round(r.face_confidence * 100)}%
                          </span>
                        )}
                      </div>

                      {/* GPS */}
                      {r.location?.latitude && (
                        <a
                          href={`https://www.google.com/maps?q=${r.location.latitude},${r.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-blue-500 hover:underline"
                        >
                          <MapPin className="w-3 h-3 text-red-400" />
                          {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)} ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

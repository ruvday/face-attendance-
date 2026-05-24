import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import {
  CheckCircle2, Clock, XCircle, ScanFace, History,
  CalendarDays, Flame, TrendingUp, MapPin, ChevronRight
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
  face_confidence: number | null;
  location: { latitude: number; longitude: number } | null;
}

function formatTime(iso: string | null) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case 'present':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"><CheckCircle2 className="w-3 h-3" />Present</span>;
    case 'late':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"><Clock className="w-3 h-3" />Late</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"><XCircle className="w-3 h-3" />Absent</span>;
  }
}

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/employee/attendance/history')
      .then(r => setRecords(r.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.date?.startsWith(today));

  // Stats for last 30 days
  const presentCount = records.filter(r => r.status === 'present').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const totalDays = records.length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;

  // Streak: consecutive present days ending today
  const sortedDesc = [...records].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const r of sortedDesc) {
    if (r.status === 'present' || r.status === 'late') streak++;
    else break;
  }

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Hey, {displayName} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Today status */}
      <div className={`rounded-2xl p-5 border ${
        todayRecord
          ? todayRecord.status === 'present'
            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
              Today's Status
            </p>
            {isLoading ? (
              <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : todayRecord ? (
              <div className="space-y-1">
                <StatusBadge status={todayRecord.status} />
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {todayRecord.check_in_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-green-500" />
                      In: <strong>{formatTime(todayRecord.check_in_at)}</strong>
                    </span>
                  )}
                  {todayRecord.check_out_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-red-400" />
                      Out: <strong>{formatTime(todayRecord.check_out_at)}</strong>
                    </span>
                  )}
                  {todayRecord.face_confidence && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                      Match: <strong>{Math.round(todayRecord.face_confidence * 100)}%</strong>
                    </span>
                  )}
                </div>
                {todayRecord.location && (
                  <a
                    href={`https://www.google.com/maps?q=${todayRecord.location.latitude},${todayRecord.location.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                  >
                    <MapPin className="w-3 h-3" />
                    {todayRecord.location.latitude.toFixed(4)}, {todayRecord.location.longitude.toFixed(4)}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xl font-bold text-slate-700 dark:text-slate-200">Not Checked In</p>
            )}
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            todayRecord
              ? 'bg-green-100 dark:bg-green-900/50'
              : 'bg-slate-200 dark:bg-slate-800'
          }`}>
            {todayRecord
              ? <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
              : <CalendarDays className="w-7 h-7 text-slate-500" />
            }
          </div>
        </div>

        {!todayRecord && !isLoading && (
          <Link
            to="/employee/scan"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-md shadow-blue-600/25"
          >
            <ScanFace className="w-4 h-4" />
            Mark Attendance Now
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          label="Present"
          value={isLoading ? '—' : String(presentCount)}
          sub="last 30 days"
          bg="bg-green-50 dark:bg-green-950/30"
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Streak"
          value={isLoading ? '—' : `${streak}d`}
          sub="in a row"
          bg="bg-orange-50 dark:bg-orange-950/30"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          label="Rate"
          value={isLoading ? '—' : `${attendanceRate}%`}
          sub="attendance"
          bg="bg-blue-50 dark:bg-blue-950/30"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/employee/scan"
          className="flex items-center justify-between p-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-md shadow-blue-600/25 group"
        >
          <div className="flex items-center gap-3">
            <ScanFace className="w-5 h-5" />
            Face Scan
          </div>
          <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          to="/employee/history"
          className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors group"
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5" />
            History
          </div>
          <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Recent records */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
          <Link to="/employee/history" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))
          ) : records.slice(0, 5).length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No records yet. Mark your first attendance!
            </div>
          ) : (
            records.slice(0, 5).map(rec => (
              <div
                key={rec.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    rec.status === 'present' ? 'bg-green-100 dark:bg-green-900/40' :
                    rec.status === 'late' ? 'bg-amber-100 dark:bg-amber-900/40' :
                    'bg-red-100 dark:bg-red-900/40'
                  }`}>
                    {rec.status === 'present' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                     rec.status === 'late' ? <Clock className="w-4 h-4 text-amber-600" /> :
                     <XCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatDate(rec.date)}</p>
                    <p className="text-xs text-slate-400">{formatTime(rec.check_in_at)} → {formatTime(rec.check_out_at)}</p>
                  </div>
                </div>
                <StatusBadge status={rec.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, bg }: {
  icon: React.ReactNode; label: string; value: string; sub: string; bg: string;
}) {
  return (
    <div className={`rounded-xl p-3.5 border border-transparent ${bg}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

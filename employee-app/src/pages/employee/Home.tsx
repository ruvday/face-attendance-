import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { ScanFace, CheckCircle2, Clock, LogOut } from 'lucide-react';

interface TodayRecord {
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const now = useLiveClock();
  const [today, setToday] = useState<TodayRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const firstName = (user?.full_name || user?.email || 'there').split(' ')[0];

  useEffect(() => {
    api.get('/employee/attendance/history')
      .then(r => {
        const todayStr = new Date().toISOString().split('T')[0];
        const rec = (r.data || []).find((x: any) => x.date?.startsWith(todayStr));
        setToday(rec ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatTime = (iso: string | null) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const checkedIn = !!today?.check_in_at;
  const checkedOut = !!today?.check_out_at;
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-full flex flex-col items-center pb-8">

      {/* Greeting */}
      <div className="w-full text-center pt-4 pb-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">{greeting}</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{firstName} 👋</h1>
      </div>

      {/* Live clock */}
      <div className="text-center mb-6">
        <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-sm text-slate-400 mt-1">
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Status card */}
      <div className={`w-full max-w-sm rounded-3xl p-6 mb-8 shadow-lg text-center transition-colors ${
        loading
          ? 'bg-slate-100 dark:bg-slate-800'
          : checkedIn
          ? 'bg-green-50 dark:bg-green-950/40 border-2 border-green-200 dark:border-green-800'
          : 'bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700'
      }`}>
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : checkedIn ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-9 h-9 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-1">
              {checkedOut ? 'Checked Out' : 'Checked In'}
            </p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {formatTime(checkedOut ? today!.check_out_at : today!.check_in_at)}
            </p>
            {checkedIn && !checkedOut && (
              <p className="text-xs text-slate-400 mt-2">Tap Scan to check out</p>
            )}
            {checkedOut && (
              <p className="text-xs text-slate-400 mt-2">
                In: {formatTime(today!.check_in_at)} → Out: {formatTime(today!.check_out_at)}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-9 h-9 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Not Checked In</p>
            <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">Scan your face to start</p>
          </>
        )}
      </div>

      {/* BIG SCAN BUTTON */}
      <button
        onClick={() => navigate('/employee/scan')}
        className="w-full max-w-sm mx-auto relative overflow-hidden rounded-3xl bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all duration-150 shadow-2xl shadow-blue-600/40 p-8 flex flex-col items-center gap-3 group"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-3xl bg-blue-400 opacity-0 group-hover:opacity-10 transition-opacity" />

        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
          <ScanFace className="w-11 h-11 text-white" />
        </div>
        <div className="text-center">
          <p className="text-white text-2xl font-black">SCAN FACE</p>
          <p className="text-blue-200 text-sm mt-0.5">
            {checkedIn && !checkedOut ? 'Check out' : 'Mark attendance'}
          </p>
        </div>
      </button>
    </div>
  );
}

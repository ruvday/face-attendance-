import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { getSocket, disconnectSocket } from '../../lib/socket';
import { useAuthStore } from '../../store/auth';
import { Users, CalendarCheck, Clock, AlertTriangle, MapPin, Wifi, WifiOff, LogIn, LogOut } from 'lucide-react';

interface LiveEvent {
  id: string;
  fullName: string;
  isCheckOut: boolean;
  timestamp: string;
  confidence: number;
  location: { latitude: number; longitude: number } | null;
}

interface Stats {
  total: number;
  present: number;
  late: number;
  absent: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, late: 0, absent: 0 });
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { token } = useAuthStore();
  const feedRef = useRef<HTMLDivElement>(null);

  // Load initial stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [empRes, attRes] = await Promise.all([
          api.get('/admin/employees'),
          api.get('/admin/attendance'),
        ]);
        const total = empRes.data.length;
        const todayRecords: any[] = attRes.data;
        const present = todayRecords.filter((a) => a.status === 'present').length;
        const late = todayRecords.filter((a) => a.status === 'late').length;
        const absent = Math.max(0, total - present - late);
        setStats({ total, present, late, absent });
      } catch {
        // silently fail — live data will still work
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Set up persistent WebSocket — events accumulate, never deleted
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('attendance_marked', (data: any) => {
      const event: LiveEvent = {
        id: `${Date.now()}-${Math.random()}`,
        fullName: data.fullName,
        isCheckOut: data.isCheckOut ?? false,
        timestamp: data.timestamp ?? new Date().toISOString(),
        confidence: data.confidence ?? 0,
        location: data.location ?? null,
      };

      // Add to top of list — never removed
      setLiveEvents(prev => [event, ...prev]);

      // Update stat counters live
      if (!data.isCheckOut) {
        setStats(prev => ({
          ...prev,
          present: prev.present + 1,
          absent: Math.max(0, prev.absent - 1),
        }));
      }

      // Scroll feed to top for newest event
      if (feedRef.current) {
        feedRef.current.scrollTop = 0;
      }
    });

    return () => {
      socket.off('attendance_marked');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      disconnectSocket();
    };
  }, [token]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Live connection indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
          connected
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:border-green-800 dark:text-green-400'
            : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'
        }`}>
          {connected
            ? <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> LIVE</>
            : <><WifiOff className="w-3 h-3" /> Connecting...</>
          }
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Employees', value: stats.total, icon: <Users className="w-5 h-5 text-slate-500" />, color: 'border-slate-200 dark:border-slate-700' },
          { label: 'Present Today', value: stats.present, icon: <CalendarCheck className="w-5 h-5 text-green-500" />, color: 'border-green-200 dark:border-green-800' },
          { label: 'Late Check-ins', value: stats.late, icon: <Clock className="w-5 h-5 text-amber-500" />, color: 'border-amber-200 dark:border-amber-800' },
          { label: 'Not Yet In', value: stats.absent, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, color: 'border-red-200 dark:border-red-800' },
        ].map((s) => (
          <div key={s.label} className={`bg-white dark:bg-slate-900 rounded-xl border ${s.color} p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{s.label}</span>
              {s.icon}
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoadingStats ? '—' : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Live feed — persistent, never deletable */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

        {/* Feed header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {connected && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
            <h2 className="font-semibold text-slate-900 dark:text-white">Live Activity Feed</h2>
            {liveEvents.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold">
                {liveEvents.length}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">All scans this session — auto-updating</span>
        </div>

        {/* Feed body — scrollable, events never removed */}
        <div ref={feedRef} className="max-h-[420px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
          {liveEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Wifi className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">Waiting for employee scans...</p>
              <p className="text-xs">Every check-in and check-out will appear here instantly</p>
            </div>
          ) : (
            liveEvents.map((ev, idx) => (
              <div
                key={ev.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  idx === 0 ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Icon */}
                <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  ev.isCheckOut
                    ? 'bg-amber-100 dark:bg-amber-900/40'
                    : 'bg-green-100 dark:bg-green-900/40'
                }`}>
                  {ev.isCheckOut
                    ? <LogOut className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    : <LogIn className="w-4 h-4 text-green-600 dark:text-green-400" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-white">{ev.fullName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      ev.isCheckOut
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    }`}>
                      {ev.isCheckOut ? 'CHECKED OUT' : 'CHECKED IN'}
                    </span>
                    {ev.confidence > 0 && (
                      <span className="text-xs text-slate-400 font-mono">
                        {Math.round(ev.confidence * 100)}% match
                      </span>
                    )}
                    {idx === 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500 text-white uppercase tracking-wide">new</span>
                    )}
                  </div>

                  {/* Timestamp — permanent */}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formatTime(ev.timestamp)}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(ev.timestamp)}</span>

                    {/* GPS location — permanent */}
                    {ev.location ? (
                      <a
                        href={`https://www.google.com/maps?q=${ev.location.latitude},${ev.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                      >
                        <MapPin className="w-3 h-3 text-red-500" />
                        {ev.location.latitude.toFixed(5)}, {ev.location.longitude.toFixed(5)}
                        <span className="text-slate-400 font-normal">↗ Maps</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="w-3 h-3" />
                        No GPS
                      </span>
                    )}
                  </div>
                </div>

                {/* Sequence number — shows this was the Nth event */}
                <span className="text-xs text-slate-300 dark:text-slate-600 font-mono shrink-0 mt-1">
                  #{liveEvents.length - idx}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {liveEvents.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 text-center">
              {liveEvents.length} event{liveEvents.length !== 1 ? 's' : ''} recorded this session •
              All data is saved permanently in the database • Refresh the <a href="/admin/attendance" className="text-blue-500 hover:underline">Attendance page</a> to see full history
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

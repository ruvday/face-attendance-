import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { LogOut, ScanFace, CheckCircle2, AlertCircle, User, Mail, Hash, Briefcase, Building2 } from 'lucide-react';

interface Profile {
  full_name: string;
  email: string;
  employee_code: string;
  login_code: string;
  department: string;
  position: string;
  face_registered_at: string | null;
  avatar_url: string | null;
}

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/employee/profile')
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const name = profile?.full_name || user?.full_name || user?.email || 'Employee';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const faceOk = !!profile?.face_registered_at;

  return (
    <div className="flex flex-col items-center pb-8 pt-2">

      {/* Avatar */}
      <div className="relative mb-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={name}
            className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-xl"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl">
            <span className="text-4xl font-black text-white">{initials}</span>
          </div>
        )}
        {/* Face status dot */}
        <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 ${
          faceOk ? 'bg-green-500' : 'bg-amber-500'
        }`}>
          {faceOk ? <CheckCircle2 className="w-4 h-4 text-white" /> : <AlertCircle className="w-4 h-4 text-white" />}
        </div>
      </div>

      {/* Name */}
      {loading ? (
        <div className="h-8 w-40 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mb-2" />
      ) : (
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{name}</h2>
      )}

      {/* Login code badge */}
      {profile?.login_code && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 mb-6">
          <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide">PIN</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-[0.2em] font-mono">
            {profile.login_code}
          </span>
        </div>
      )}

      {/* Info cards */}
      <div className="w-full max-w-sm space-y-3">

        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))
        ) : (
          <>
            {[
              { icon: <User className="w-5 h-5 text-blue-500" />, label: 'Full Name', value: profile?.full_name },
              { icon: <Mail className="w-5 h-5 text-purple-500" />, label: 'Email', value: profile?.email },
              { icon: <Hash className="w-5 h-5 text-green-500" />, label: 'Employee Code', value: profile?.employee_code },
              { icon: <Building2 className="w-5 h-5 text-orange-500" />, label: 'Department', value: profile?.department },
              { icon: <Briefcase className="w-5 h-5 text-pink-500" />, label: 'Position', value: profile?.position },
            ].filter(f => f.value).map(field => (
              <div key={field.label} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {field.icon}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{field.label}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{field.value}</p>
                </div>
              </div>
            ))}

            {/* Face registration status */}
            <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-sm ${
              faceOk
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                faceOk ? 'bg-green-100 dark:bg-green-900/50' : 'bg-amber-100 dark:bg-amber-900/50'
              }`}>
                <ScanFace className={`w-5 h-5 ${faceOk ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500">Face ID</p>
                <p className={`text-sm font-bold ${faceOk ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {faceOk ? `Registered ${new Date(profile!.face_registered_at!).toLocaleDateString()}` : 'Not registered yet'}
                </p>
              </div>
              {!faceOk && (
                <button
                  onClick={() => navigate('/employee/scan')}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-3 py-1.5 rounded-lg"
                >
                  Setup
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mt-8 flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors active:scale-95"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
}

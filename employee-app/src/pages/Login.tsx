import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Delete, ArrowRight, ScanFace } from 'lucide-react';

const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','→'];

export default function Login() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleKey = async (key: string) => {
    if (isLoading) return;
    setError('');

    if (key === '⌫') {
      setCode(prev => prev.slice(0, -1));
      return;
    }
    if (key === '→') {
      if (code.length < 4) { triggerShake(); return; }
      await submit(code);
      return;
    }
    if (code.length >= 6) return;
    const next = code + key;
    setCode(next);
    if (next.length === 6) await submit(next);
  };

  const submit = async (value: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/employee-login', { loginCode: value });
      setAuth(res.data.user, res.data.token);
      navigate('/employee');
    } catch {
      setError('Wrong code. Try again.');
      triggerShake();
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 select-none">

      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-3xl bg-blue-500 shadow-xl shadow-blue-200 flex items-center justify-center mb-4">
          <ScanFace className="w-11 h-11 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">FaceAtend</h1>
        <p className="text-slate-400 text-sm mt-1 font-medium">Enter your PIN code</p>
      </div>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-3 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < code.length
                ? 'bg-blue-500 border-blue-500 scale-110'
                : 'bg-transparent border-slate-300'
            }`}
          />
        ))}
      </div>

      {/* Error */}
      <div className="h-8 flex items-center mb-4">
        {error && (
          <span className="text-red-500 text-sm font-semibold">{error}</span>
        )}
      </div>

      {/* PIN pad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((key) => {
          const isSubmit = key === '→';
          const isDelete = key === '⌫';

          return (
            <button
              key={key}
              onClick={() => handleKey(key)}
              disabled={isLoading}
              className={`
                h-20 rounded-2xl text-2xl font-bold flex items-center justify-center
                transition-all duration-100 active:scale-95 select-none
                ${isSubmit
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : isDelete
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {isDelete ? <Delete className="w-6 h-6" /> : isSubmit ? <ArrowRight className="w-7 h-7" /> : key}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="mt-8 flex items-center gap-2 text-slate-400 text-sm">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Signing in...
        </div>
      )}
    </div>
  );
}

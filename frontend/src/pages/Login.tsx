import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ScanFace, UserCircle, Building2 } from 'lucide-react';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState<'employee' | 'admin'>('employee');
  
  // Employee state
  const [tenantSlug, setTenantSlug] = useState('');
  const [loginCode, setLoginCode] = useState('');
  
  // Admin state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let response;
      if (loginMethod === 'employee') {
        response = await api.post('/auth/employee-login', { tenantSlug, loginCode });
      } else {
        response = await api.post('/auth/login', { email, password });
      }
      
      setAuth(response.data.user, response.data.token);
      
      const role = response.data.user.role;
      if (role === 'super_admin') navigate('/superadmin');
      else if (role === 'admin') navigate('/admin');
      else navigate('/employee');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center transform rotate-12 transition-transform hover:rotate-0 duration-300">
            <ScanFace className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          Welcome to FaceAtend
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Next-generation biometric attendance management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
              <button
                onClick={() => { setLoginMethod('employee'); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginMethod === 'employee' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Employee Login
              </button>
              <button
                onClick={() => { setLoginMethod('admin'); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginMethod === 'admin' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Admin Login
              </button>
            </div>
            <CardTitle>{loginMethod === 'employee' ? 'Employee Access' : 'Admin Access'}</CardTitle>
            <CardDescription>
              {loginMethod === 'employee' ? 'Enter your company code and 4-digit PIN.' : 'Sign in to manage your company.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {loginMethod === 'employee' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tenantSlug" className="flex items-center gap-2"><Building2 className="w-4 h-4"/> Company Code</Label>
                    <Input 
                      id="tenantSlug" 
                      type="text" 
                      required 
                      placeholder="e.g. apple-inc"
                      value={tenantSlug}
                      onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
                      className="bg-white/50 dark:bg-slate-800/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loginCode" className="flex items-center gap-2"><UserCircle className="w-4 h-4"/> 4-Digit Employee Code</Label>
                    <Input 
                      id="loginCode" 
                      type="text" 
                      required 
                      maxLength={10}
                      placeholder="e.g. 5829"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      className="bg-white/50 dark:bg-slate-800/50 text-xl tracking-widest font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      placeholder="admin@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/50 dark:bg-slate-800/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/50 dark:bg-slate-800/50"
                    />
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

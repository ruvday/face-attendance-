import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ScanFace, UserCircle } from 'lucide-react';

export default function Login() {
  const [loginCode, setLoginCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/employee-login', { loginCode });
      setAuth(response.data.user, response.data.token);
      navigate('/employee');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid login code');
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
          FaceAtend
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Employee Access Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your unique 6-digit PIN to access the portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="loginCode" className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4"/> 6-Digit PIN
                </Label>
                <Input 
                  id="loginCode" 
                  type="text" 
                  required 
                  maxLength={6}
                  placeholder="e.g. 582931"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  className="bg-white/50 dark:bg-slate-800/50 text-2xl tracking-[0.25em] font-mono text-center py-6"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all py-6 text-lg"
                disabled={isLoading || loginCode.length < 4}
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

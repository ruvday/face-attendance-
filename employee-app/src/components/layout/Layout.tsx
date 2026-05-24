import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { LogOut, Users, LayoutDashboard, Calendar, ScanFace, Building2 } from 'lucide-react';

export const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = {
    super_admin: [
      { name: 'Dashboard', path: '/superadmin', icon: <LayoutDashboard className="w-5 h-5" /> },
      { name: 'Tenants', path: '/superadmin/tenants', icon: <Building2 className="w-5 h-5" /> },
      { name: 'Admins', path: '/superadmin/admins', icon: <Users className="w-5 h-5" /> },
    ],
    admin: [
      { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
      { name: 'Employees', path: '/admin/employees', icon: <Users className="w-5 h-5" /> },
      { name: 'Attendance', path: '/admin/attendance', icon: <Calendar className="w-5 h-5" /> },
    ],
    employee: [
      { name: 'Dashboard', path: '/employee', icon: <LayoutDashboard className="w-5 h-5" /> },
      { name: 'Scan Face', path: '/employee/scan', icon: <ScanFace className="w-5 h-5" /> },
      { name: 'History', path: '/employee/history', icon: <Calendar className="w-5 h-5" /> },
    ]
  };

  const links = user ? navItems[user.role as keyof typeof navItems] : [];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            FaceAtend
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                }`}
              >
                {link.icon}
                <span className="font-medium">{link.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user?.email}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

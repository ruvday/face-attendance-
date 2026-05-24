import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, ScanFace, CalendarDays, User } from 'lucide-react';

const tabs = [
  { to: '/employee', icon: Home, label: 'Home', exact: true },
  { to: '/employee/scan', icon: ScanFace, label: 'Scan' },
  { to: '/employee/history', icon: CalendarDays, label: 'History' },
  { to: '/employee/profile', icon: User, label: 'Profile' },
];

export function EmployeeLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 pt-6">
        <Outlet />
      </div>

      {/* Bottom tab bar */}
      <nav className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-bottom shadow-2xl">
        <div className="flex items-stretch">
          {tabs.map(({ to, icon: Icon, label, exact }) => {
            const isActive = exact
              ? location.pathname === to
              : location.pathname.startsWith(to) && !(exact && location.pathname !== to);

            return (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors"
              >
                {({ isActive: navActive }) => {
                  const active = exact ? location.pathname === to : navActive;
                  return (
                    <>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-150 ${
                        active
                          ? 'bg-blue-600 shadow-lg shadow-blue-500/30 scale-105'
                          : 'bg-transparent'
                      }`}>
                        <Icon className={`w-5 h-5 transition-colors ${
                          active ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                        }`} />
                      </div>
                      <span className={`text-[10px] font-semibold tracking-wide transition-colors ${
                        active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {label}
                      </span>
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

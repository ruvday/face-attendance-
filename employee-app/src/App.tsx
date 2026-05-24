import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { EmployeeLayout } from './components/layout/EmployeeLayout';

import Home from './pages/employee/Home';
import ScanFace from './pages/employee/ScanFace';
import History from './pages/employee/History';
import Profile from './pages/employee/Profile';

import AdminDashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import Attendance from './pages/admin/Attendance';

import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Tenants from './pages/superadmin/Tenants';
import Admins from './pages/superadmin/Admins';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* ── Super Admin ── */}
        <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
          <Route element={<Layout />}>
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/tenants" element={<Tenants />} />
            <Route path="/superadmin/admins" element={<Admins />} />
          </Route>
        </Route>

        {/* ── Admin / Tenant ── */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<Layout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/attendance" element={<Attendance />} />
          </Route>
        </Route>

        {/* ── Employee (bottom-tab mobile layout) ── */}
        <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/employee" element={<Home />} />
            <Route path="/employee/scan" element={<ScanFace />} />
            <Route path="/employee/history" element={<History />} />
            <Route path="/employee/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

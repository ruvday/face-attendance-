import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout/Layout';

import EmployeeDashboard from './pages/employee/Dashboard';
import ScanFace from './pages/employee/ScanFace';
import History from './pages/employee/History';
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
        
        <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
          <Route element={<Layout />}>
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/tenants" element={<Tenants />} />
            <Route path="/superadmin/admins" element={<Admins />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<Layout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/attendance" element={<Attendance />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
          <Route element={<Layout />}>
            <Route path="/employee" element={<EmployeeDashboard />} />
            <Route path="/employee/scan" element={<ScanFace />} />
            <Route path="/employee/history" element={<History />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

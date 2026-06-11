import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Topbar   from './components/Topbar';
import Sidebar  from './components/Sidebar';

import LoginPage      from './pages/LoginPage';

// Operational
import OrderEntryPage    from './pages/operational/OrderEntryPage';
import StockRequestPage  from './pages/operational/StockRequestPage';
import TimesheetPage     from './pages/operational/TimesheetPage';
import TasksPage         from './pages/operational/TasksPage';
import CompliancePage    from './pages/operational/CompliancePage';

// Management
import SalesDashboardPage   from './pages/management/SalesDashboardPage';
import InventoryPage        from './pages/management/InventoryPage';
import StaffPage            from './pages/management/StaffPage';
import AlertsPage           from './pages/management/AlertsPage';

// Senior
import KPIDashboardPage  from './pages/senior/KPIDashboardPage';
import AnalyticsPage     from './pages/senior/AnalyticsPage';
import FinancialPage     from './pages/senior/FinancialPage';

// Admin
import AdminBranchesPage from './pages/admin/AdminBranchesPage';
import AdminUsersPage    from './pages/admin/AdminUsersPage';
import AdminMenuPage     from './pages/admin/AdminMenuPage';

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'OPERATIONAL') return <Navigate to="/orders"    replace />;
  if (user.role === 'MANAGEMENT')  return <Navigate to="/sales"     replace />;
  if (user.role === 'SENIOR')      return <Navigate to="/kpi"       replace />;
  return <Navigate to="/admin/branches" replace />;
}

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*"      element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-body">
          <Routes>
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* Level 1 — Operational */}
            <Route path="/orders"     element={<ProtectedRoute allowedRoles={['OPERATIONAL','MANAGEMENT','ADMIN']}><OrderEntryPage /></ProtectedRoute>} />
            <Route path="/stock"      element={<ProtectedRoute allowedRoles={['OPERATIONAL','MANAGEMENT','ADMIN']}><StockRequestPage /></ProtectedRoute>} />
            <Route path="/timesheet"  element={<ProtectedRoute allowedRoles={['OPERATIONAL','MANAGEMENT','ADMIN']}><TimesheetPage /></ProtectedRoute>} />
            <Route path="/tasks"      element={<ProtectedRoute allowedRoles={['OPERATIONAL','MANAGEMENT','ADMIN']}><TasksPage /></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute allowedRoles={['OPERATIONAL','MANAGEMENT','ADMIN']}><CompliancePage /></ProtectedRoute>} />

            {/* Level 2 — Management */}
            <Route path="/sales"     element={<ProtectedRoute allowedRoles={['MANAGEMENT','SENIOR','ADMIN']}><SalesDashboardPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute allowedRoles={['MANAGEMENT','SENIOR','ADMIN']}><InventoryPage /></ProtectedRoute>} />
            <Route path="/staff"     element={<ProtectedRoute allowedRoles={['MANAGEMENT','SENIOR','ADMIN']}><StaffPage /></ProtectedRoute>} />
            <Route path="/alerts"    element={<ProtectedRoute allowedRoles={['MANAGEMENT','SENIOR','ADMIN']}><AlertsPage /></ProtectedRoute>} />

            {/* Level 3 — Senior */}
            <Route path="/kpi"       element={<ProtectedRoute allowedRoles={['SENIOR','ADMIN']}><KPIDashboardPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['SENIOR','ADMIN']}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/financial" element={<ProtectedRoute allowedRoles={['SENIOR','ADMIN']}><FinancialPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/branches" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminBranchesPage /></ProtectedRoute>} />
            <Route path="/admin/users"    element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/menu"     element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminMenuPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
